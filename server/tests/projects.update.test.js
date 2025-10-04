let controller; // lazy require after globals

describe('projects/update controller', () => {
  let originalGlobals;
  let projectState;
  let projectManagerRecord;
  let currentUser;
  let boardMembershipsTotal;
  let updateBehavior; // { errorCode?: string } or null
  let boardsForProject;

  beforeEach(() => {
    originalGlobals = {
      sails: global.sails,
      _: global._,
      Project: global.Project,
      ProjectManager: global.ProjectManager,
      Board: global.Board,
      BackgroundImage: global.BackgroundImage,
      User: global.User,
    };

    // Ensure lodash
    // eslint-disable-next-line global-require
    if (!global._) global._ = require('lodash');

    currentUser = { id: 'u1', role: 'member' };
    projectState = {
      id: 'p1',
      name: 'Proj',
      useScrum: false,
      ownerProjectManagerId: null,
    };
    projectManagerRecord = null; // default: user not manager
    boardMembershipsTotal = 0;
    updateBehavior = null;
    boardsForProject = [
      { id: 'b1', showCardCount: true },
      { id: 'b2', showCardCount: true },
    ];

    const makeUpdateBuilder = (values) => {
      const builder = {
        error:
          updateBehavior && updateBehavior.errorCode ? { code: updateBehavior.errorCode } : null,
        result: { ...projectState, ...values },
        intercept(code, handler) {
          if (this.error && this.error.code === code) {
            // Map error via handler()
            this.error.mapped = handler();
          }
          return this;
        },
        then(resolve, reject) {
          if (this.error) {
            return reject(this.error.mapped || this.error);
          }
          return resolve(this.result);
        },
        catch(fn) {
          if (this.error) {
            return fn(this.error.mapped || this.error);
          }
          return this;
        },
      };
      return builder;
    };

    global.Project = {
      qm: {
        getOneById: jest
          .fn()
          .mockImplementation((id) => (id === projectState.id ? { ...projectState } : null)),
      },
      BackgroundTypes: { COLOR: 'color', IMAGE: 'image' },
      BACKGROUND_GRADIENTS: ['g1', 'g2'],
      Types: { PRIVATE: 'private', PUBLIC: 'public' },
    };

    global.User = { Roles: { ADMIN: 'admin', PERSONAL_PROJECT_OWNER: 'personal_owner' } };

    global.ProjectManager = {
      qm: {
        getOneByProjectIdAndUserId: jest.fn().mockImplementation(() => projectManagerRecord),
        getOneById: jest.fn().mockImplementation((id, { projectId }) => {
          if (projectId === projectState.id && id === 'pm2') {
            return { id: 'pm2', userId: 'u2' };
          }
          return null;
        }),
      },
    };

    global.BackgroundImage = {
      qm: {
        getOneById: jest.fn().mockImplementation((id, { projectId }) => {
          if (projectId === projectState.id && id === 'bg1') {
            return { id: 'bg1' };
          }
          return null;
        }),
      },
    };

    global.Board = {
      qm: {
        getByProjectId: jest.fn().mockResolvedValue(boardsForProject),
      },
    };

    const projectsHelper = {
      updateOne: {
        with: jest.fn().mockImplementation(({ values }) => makeUpdateBuilder(values)),
      },
      createScrumBoards: { with: jest.fn().mockResolvedValue({}) },
      deleteScrumBoards: { with: jest.fn().mockResolvedValue({}) },
      getBoardMembershipsTotalByIdAndUserId: jest.fn().mockResolvedValue(boardMembershipsTotal),
    };

    global.sails = {
      helpers: {
        projects: projectsHelper,
        boards: {
          updateOne: {
            with: jest.fn().mockImplementation(({ values, record }) => ({ ...record, ...values })),
          },
        },
      },
    };

    // Lazy require
    // eslint-disable-next-line global-require
    controller = require('../api/controllers/projects/update');
  });

  afterEach(() => {
    global.sails = originalGlobals.sails;
    global._ = originalGlobals._;
    global.Project = originalGlobals.Project;
    global.ProjectManager = originalGlobals.ProjectManager;
    global.Board = originalGlobals.Board;
    global.BackgroundImage = originalGlobals.BackgroundImage;
    global.User = originalGlobals.User;
    jest.restoreAllMocks();
  });

  const run = (inputs, overrides = {}) => {
    const ctx = { req: { currentUser: { ...currentUser, ...overrides.user } } };
    return controller.fn.call(ctx, inputs);
  };

  test('project not found', async () => {
    await expect(run({ id: 'unknown', name: 'X' })).rejects.toMatchObject({
      projectNotFound: 'Project not found',
    });
  });

  test('not enough rights when non-manager sets useScrum', async () => {
    projectState.ownerProjectManagerId = 'pm1';
    await expect(run({ id: 'p1', useScrum: true })).rejects.toMatchObject({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('favorite without membership leads to projectNotFound masking', async () => {
    await expect(run({ id: 'p1', isFavorite: true })).rejects.toMatchObject({
      projectNotFound: 'Project not found',
    });
  });

  test('favorite allowed for project manager', async () => {
    projectManagerRecord = { id: 'pm1', userId: 'u1' };
    const res = await run({ id: 'p1', isFavorite: true });
    expect(res.item).toMatchObject({ isFavorite: true });
  });

  test('ownerProjectManagerId not found (no rights to set it when project already has owner)', async () => {
    projectManagerRecord = { id: 'pm1', userId: 'u1' };
    projectState.ownerProjectManagerId = 'pmExists';
    await expect(run({ id: 'p1', ownerProjectManagerId: 'nope' })).rejects.toMatchObject({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('backgroundImageId not found', async () => {
    projectManagerRecord = { id: 'pm1', userId: 'u1' };
    await expect(run({ id: 'p1', backgroundImageId: 'missing' })).rejects.toMatchObject({
      backgroundImageNotFound: 'Background image not found',
    });
  });

  test('transition useScrum false -> true triggers board updates and scrum recreation', async () => {
    projectManagerRecord = { id: 'pm1', userId: 'u1' };
    const res = await run({ id: 'p1', useScrum: true });
    expect(res.item).toMatchObject({ useScrum: true });
    expect(global.Board.qm.getByProjectId).toHaveBeenCalled();
    expect(global.sails.helpers.boards.updateOne.with).toHaveBeenCalledTimes(
      boardsForProject.length,
    );
    expect(global.sails.helpers.projects.deleteScrumBoards.with).toHaveBeenCalled();
    expect(global.sails.helpers.projects.createScrumBoards.with).toHaveBeenCalled();
  });

  test('transition useScrum true -> false triggers delete only', async () => {
    projectManagerRecord = { id: 'pm1', userId: 'u1' };
    projectState.useScrum = true; // previous state
    const res = await run({ id: 'p1', useScrum: false });
    expect(res.item).toMatchObject({ useScrum: false });
    expect(global.sails.helpers.projects.deleteScrumBoards.with).toHaveBeenCalled();
    expect(global.sails.helpers.projects.createScrumBoards.with).not.toHaveBeenCalled();
  });

  test('intercept mapping backgroundGradientInValuesMustBePresent', async () => {
    projectManagerRecord = { id: 'pm1', userId: 'u1' };
    updateBehavior = { errorCode: 'backgroundGradientInValuesMustBePresent' };
    await expect(run({ id: 'p1', backgroundGradient: 'g1' })).rejects.toMatchObject({
      backgroundGradientMustBePresent: 'Background gradient must be present',
    });
  });

  test('intercept mapping backgroundImageInValuesMustBePresent', async () => {
    projectManagerRecord = { id: 'pm1', userId: 'u1' };
    updateBehavior = { errorCode: 'backgroundImageInValuesMustBePresent' };
    await expect(run({ id: 'p1', backgroundImageId: 'bg1' })).rejects.toMatchObject({
      backgroundImageMustBePresent: 'Background image must be present',
    });
  });

  test('intercept mapping ownerProjectManagerInValuesMustBeLastManager (admin sets initial owner)', async () => {
    currentUser.role = 'admin';
    projectState.ownerProjectManagerId = null;
    updateBehavior = { errorCode: 'ownerProjectManagerInValuesMustBeLastManager' };
    await expect(run({ id: 'p1', ownerProjectManagerId: 'pm2' })).rejects.toMatchObject({
      ownerProjectManagerMustBeLastManager: 'Owner project manager must be last manager',
    });
  });

  test('intercept mapping alreadyHasOwnerProjectManager (admin sets duplicate owner)', async () => {
    currentUser.role = 'admin';
    projectState.ownerProjectManagerId = null;
    updateBehavior = { errorCode: 'alreadyHasOwnerProjectManager' };
    await expect(run({ id: 'p1', ownerProjectManagerId: 'pm2' })).rejects.toMatchObject({
      projectAlreadyHasOwnerProjectManager: 'Project already has owner project manager',
    });
  });
});
