let createController;
let deleteController;
let indexController;
let showByCodeController;
let showController;
let updateController;
let startSprintController;

const originalGlobals = {
  sails: global.sails,
  User: global.User,
  Project: global.Project,
  BoardMembership: global.BoardMembership,
  Board: global.Board,
  ProjectFavorite: global.ProjectFavorite,
  ProjectManager: global.ProjectManager,
  BackgroundImage: global.BackgroundImage,
  BaseCustomFieldGroup: global.BaseCustomFieldGroup,
  CustomField: global.CustomField,
  NotificationService: global.NotificationService,
  List: global.List,
  _: global._,
};

const mapRecords = (records, key = 'id', filterFalsy = false) => {
  const mapped = records.map((record) => record[key]);
  return filterFalsy ? mapped.filter(Boolean) : mapped;
};

const makeInterceptable = (value, codeToThrow, shouldThrow = () => false) => ({
  intercept(code, handler) {
    if (code === codeToThrow && shouldThrow()) {
      throw handler();
    }

    return value;
  },
});

const makeChainable = (value, codeToThrow, shouldThrow = () => false) => {
  const chain = { ...value };

  Object.defineProperty(chain, 'intercept', {
    enumerable: false,
    value(code, handler) {
      if (code === codeToThrow && shouldThrow()) {
        throw handler();
      }

      return chain;
    },
  });

  return chain;
};

describe('projects controllers', () => {
  let currentUser;
  let projectRecord;

  beforeEach(() => {
    jest.resetModules();
    global._ = require('lodash'); // eslint-disable-line global-require

    currentUser = { id: 'u1', role: 'member', language: 'en' };
    projectRecord = { id: 'p1', ownerProjectManagerId: null, useScrum: false };

    global.User = {
      Roles: {
        ADMIN: 'admin',
        PERSONAL_PROJECT_OWNER: 'personal',
      },
      qm: {
        getByIds: jest.fn().mockResolvedValue([]),
        getOneById: jest.fn().mockResolvedValue({ id: 'u2' }),
      },
    };

    global.Project = {
      Types: {
        PRIVATE: 'private',
        TEAM: 'team',
      },
      BackgroundTypes: {
        GRADIENT: 'gradient',
      },
      BACKGROUND_GRADIENTS: ['sunset'],
      qm: {
        getOneById: jest.fn().mockResolvedValue(projectRecord),
        getOneByCode: jest.fn().mockResolvedValue(projectRecord),
        getByIds: jest.fn().mockResolvedValue([projectRecord]),
        getShared: jest.fn().mockResolvedValue([]),
      },
    };

    global.BoardMembership = {
      qm: {
        getByUserId: jest.fn().mockResolvedValue([]),
        getByProjectIdAndUserId: jest.fn().mockResolvedValue([]),
      },
    };

    global.Board = {
      qm: {
        getByIds: jest.fn().mockResolvedValue([]),
        getByProjectId: jest.fn().mockResolvedValue([]),
        getByProjectIds: jest.fn().mockResolvedValue([]),
      },
    };

    global.ProjectFavorite = {
      qm: {
        getByProjectIdsAndUserId: jest.fn().mockResolvedValue([]),
      },
    };

    global.ProjectManager = {
      qm: {
        getByProjectIds: jest.fn().mockResolvedValue([]),
        getByProjectId: jest.fn().mockResolvedValue([]),
        getOneByProjectIdAndUserId: jest.fn().mockResolvedValue({ id: 'pm1' }),
        getOneById: jest.fn().mockResolvedValue({ id: 'pm1', userId: 'u2' }),
      },
    };

    global.BackgroundImage = {
      qm: {
        getByProjectIds: jest.fn().mockResolvedValue([]),
        getByProjectId: jest.fn().mockResolvedValue([]),
        getOneById: jest.fn().mockResolvedValue({ id: 'bg1' }),
      },
    };

    global.BaseCustomFieldGroup = {
      qm: {
        getByProjectIds: jest.fn().mockResolvedValue([]),
        getByProjectId: jest.fn().mockResolvedValue([]),
      },
    };

    global.CustomField = {
      qm: {
        getByBaseCustomFieldGroupIds: jest.fn().mockResolvedValue([]),
      },
    };

    global.NotificationService = {
      qm: {
        getByBoardIds: jest.fn().mockResolvedValue([]),
      },
    };

    global.List = {
      Types: {
        ACTIVE: 'active',
        CLOSED: 'closed',
      },
    };

    global.sails = {
      helpers: {
        utils: {
          mapRecords,
          makeTranslator: jest.fn(() => (value) => value),
        },
        users: {
          isProjectManager: jest.fn().mockResolvedValue(true),
          getPersonalProjectsTotalById: jest.fn().mockResolvedValue(0),
          getPersonalProjectOwnerLimit: jest.fn().mockReturnValue(null),
          getManagerProjectIds: jest.fn().mockResolvedValue([]),
          isProjectFavorite: jest.fn().mockResolvedValue(false),
          presentMany: jest.fn((users) => users),
        },
        projects: {
          createOne: {
            with: jest.fn().mockResolvedValue({
              project: projectRecord,
              projectManager: { id: 'pm1' },
            }),
          },
          deleteOne: {
            with: jest.fn().mockReturnValue(makeInterceptable({ id: 'p1' })),
          },
          updateOne: {
            with: jest.fn().mockReturnValue(makeChainable({ id: 'p1', useScrum: false })),
          },
          createScrumBoards: {
            with: jest.fn().mockResolvedValue(null),
          },
          deleteScrumBoards: {
            with: jest.fn().mockResolvedValue(null),
          },
          getBoardMembershipsTotalByIdAndUserId: jest.fn().mockResolvedValue(1),
          startSprint: {
            with: jest.fn().mockResolvedValue({ id: 's1' }),
          },
        },
        boards: {
          createOne: {
            with: jest.fn().mockResolvedValue({ board: { id: 'b1' } }),
          },
          updateOne: {
            with: jest.fn().mockResolvedValue({ id: 'b1' }),
          },
        },
        lists: {
          createOne: {
            with: jest.fn().mockResolvedValue({ id: 'l1' }),
          },
        },
        backgroundImages: {
          presentMany: jest.fn((images) => images),
        },
      },
    };

    // eslint-disable-next-line global-require
    createController = require('../api/controllers/projects/create');
    // eslint-disable-next-line global-require
    deleteController = require('../api/controllers/projects/delete');
    // eslint-disable-next-line global-require
    indexController = require('../api/controllers/projects/index');
    // eslint-disable-next-line global-require
    showByCodeController = require('../api/controllers/projects/show-by-code');
    // eslint-disable-next-line global-require
    showController = require('../api/controllers/projects/show');
    // eslint-disable-next-line global-require
    updateController = require('../api/controllers/projects/update');
    // eslint-disable-next-line global-require
    startSprintController = require('../api/controllers/projects/start-sprint');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalGlobals.sails;
    global.User = originalGlobals.User;
    global.Project = originalGlobals.Project;
    global.BoardMembership = originalGlobals.BoardMembership;
    global.Board = originalGlobals.Board;
    global.ProjectFavorite = originalGlobals.ProjectFavorite;
    global.ProjectManager = originalGlobals.ProjectManager;
    global.BackgroundImage = originalGlobals.BackgroundImage;
    global.BaseCustomFieldGroup = originalGlobals.BaseCustomFieldGroup;
    global.CustomField = originalGlobals.CustomField;
    global.NotificationService = originalGlobals.NotificationService;
    global.List = originalGlobals.List;
    global._ = originalGlobals._;
  });

  const call = (controller, inputs, overrides = {}) =>
    controller.fn.call(
      {
        req: {
          currentUser: { ...currentUser, ...(overrides.currentUser || {}) },
          getLocale: () => 'en',
          ...overrides,
        },
      },
      inputs,
    );

  test('projects/create validates personal project type and limits', async () => {
    currentUser.role = User.Roles.PERSONAL_PROJECT_OWNER;

    await expect(
      call(createController, { type: Project.Types.TEAM, name: 'X', code: 'X', template: 'none' }),
    ).rejects.toEqual({
      invalidType: 'Invalid type',
    });

    sails.helpers.users.getPersonalProjectsTotalById.mockResolvedValueOnce(2);
    sails.helpers.users.getPersonalProjectOwnerLimit.mockReturnValueOnce(2);
    await expect(
      call(createController, {
        type: Project.Types.PRIVATE,
        name: 'X',
        code: 'X',
        template: 'none',
      }),
    ).rejects.toEqual({
      personalProjectsLimitReached: 'Personal projects limit reached',
    });
  });

  test('projects/create creates kaban template boards and lists', async () => {
    currentUser.role = User.Roles.ADMIN;

    const result = await call(createController, {
      type: Project.Types.PRIVATE,
      name: 'Alpha',
      code: 'A',
      template: 'kaban',
    });

    expect(sails.helpers.boards.createOne.with).toHaveBeenCalled();
    expect(sails.helpers.lists.createOne.with).toHaveBeenCalledTimes(3);

    const listNames = sails.helpers.lists.createOne.with.mock.calls.map(
      ([{ values }]) => values.name,
    );
    expect(listNames).toEqual(['To do', 'Ongoing', 'Done']);
    expect(result).toEqual({
      item: projectRecord,
      included: {
        projectManagers: [{ id: 'pm1' }],
      },
    });
  });

  test('projects/create creates scrum template', async () => {
    currentUser.role = User.Roles.ADMIN;

    await call(createController, {
      type: Project.Types.PRIVATE,
      name: 'Beta',
      code: 'B',
      template: 'scrum',
      sprintDuration: 2,
    });

    const createArgs = sails.helpers.projects.createOne.with.mock.calls[0][0];
    expect(createArgs.values).toEqual(
      expect.objectContaining({ useScrum: true, useStoryPoints: true, sprintDuration: 2 }),
    );
    expect(sails.helpers.projects.createScrumBoards.with).toHaveBeenCalled();
  });

  test('projects/delete handles not found, forbidden, and must-not-have-boards', async () => {
    Project.qm.getOneById.mockResolvedValueOnce(null);
    await expect(call(deleteController, { id: 'p1' })).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    Project.qm.getOneById.mockResolvedValueOnce(projectRecord);
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(call(deleteController, { id: 'p1' })).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    Project.qm.getOneById.mockResolvedValueOnce(projectRecord);
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    sails.helpers.projects.deleteOne.with.mockReturnValueOnce(
      makeInterceptable(null, 'mustNotHaveBoards', () => true),
    );
    await expect(call(deleteController, { id: 'p1' })).rejects.toEqual({
      mustNotHaveBoards: 'Must not have boards',
    });
  });

  test('projects/delete returns not found when delete returns null', async () => {
    Project.qm.getOneById.mockResolvedValueOnce(projectRecord);
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    sails.helpers.projects.deleteOne.with.mockReturnValueOnce(makeInterceptable(null));

    await expect(call(deleteController, { id: 'p1' })).rejects.toEqual({
      projectNotFound: 'Project not found',
    });
  });

  test('projects/delete succeeds', async () => {
    Project.qm.getOneById.mockResolvedValueOnce(projectRecord);
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    sails.helpers.projects.deleteOne.with.mockReturnValueOnce(makeInterceptable({ id: 'p1' }));

    const result = await call(deleteController, { id: 'p1' });

    expect(result).toEqual({ item: { id: 'p1' } });
  });

  test('projects/index builds combined project list for admin', async () => {
    currentUser.role = User.Roles.ADMIN;
    sails.helpers.users.getManagerProjectIds.mockResolvedValueOnce(['p1']);

    Project.qm.getShared.mockResolvedValueOnce([{ id: 'p2' }]);
    Project.qm.getByIds.mockResolvedValueOnce([
      { id: 'p1', isFavorite: false },
      { id: 'p3', isFavorite: false },
    ]);

    BoardMembership.qm.getByUserId.mockResolvedValueOnce([{ boardId: 'b2' }]);
    Board.qm.getByIds.mockResolvedValueOnce([{ id: 'b2', projectId: 'p3' }]);
    Board.qm.getByProjectIds.mockResolvedValueOnce([{ id: 'b1', projectId: 'p1' }]);

    ProjectFavorite.qm.getByProjectIdsAndUserId.mockResolvedValueOnce([{ projectId: 'p1' }]);

    ProjectManager.qm.getByProjectIds.mockResolvedValueOnce([{ id: 'pm1', userId: 'u2' }]);
    User.qm.getByIds.mockResolvedValueOnce([{ id: 'u2' }]);

    BaseCustomFieldGroup.qm.getByProjectIds.mockResolvedValueOnce([{ id: 'bcfg1' }]);
    CustomField.qm.getByBaseCustomFieldGroupIds.mockResolvedValueOnce([{ id: 'cf1' }]);
    BackgroundImage.qm.getByProjectIds.mockResolvedValueOnce([{ id: 'bg1' }]);

    const result = await call(indexController, {});

    expect(NotificationService.qm.getByBoardIds).toHaveBeenCalledWith(['b1']);
    expect(result.items).toEqual([
      { id: 'p1', isFavorite: true },
      { id: 'p3', isFavorite: false },
      { id: 'p2', isFavorite: false },
    ]);
    expect(result.included.users).toEqual([{ id: 'u2' }]);
  });

  test('projects/show rejects non-member access and includes membership boards', async () => {
    Project.qm.getOneById.mockResolvedValueOnce(null);
    await expect(call(showController, { id: 'p1' })).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1', ownerProjectManagerId: 'pm1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    BoardMembership.qm.getByProjectIdAndUserId.mockResolvedValueOnce([]);
    await expect(call(showController, { id: 'p1' })).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1', ownerProjectManagerId: 'pm1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    BoardMembership.qm.getByProjectIdAndUserId.mockResolvedValueOnce([{ boardId: 'b2' }]);
    Board.qm.getByIds.mockResolvedValueOnce([{ id: 'b2', projectId: 'p1' }]);
    sails.helpers.users.isProjectFavorite.mockResolvedValueOnce(true);

    const result = await call(showController, { id: 'p1' });

    expect(result.item).toEqual({ id: 'p1', ownerProjectManagerId: 'pm1', isFavorite: true });
    expect(result.included.boards).toEqual([{ id: 'b2', projectId: 'p1' }]);
  });

  test('projects/show-by-code returns project with notification services for manager', async () => {
    Project.qm.getOneByCode.mockResolvedValueOnce({ id: 'p1', ownerProjectManagerId: null });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    Board.qm.getByProjectId.mockResolvedValueOnce([{ id: 'b1', projectId: 'p1' }]);

    const result = await call(showByCodeController, { code: 'P1' });

    expect(NotificationService.qm.getByBoardIds).toHaveBeenCalledWith(['b1']);
    expect(result.item).toEqual({ id: 'p1', ownerProjectManagerId: null, isFavorite: false });
  });

  test('projects/update validates access and dependent records', async () => {
    Project.qm.getOneById.mockResolvedValueOnce(null);
    await expect(call(updateController, { id: 'p1', name: 'New' })).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1', ownerProjectManagerId: null });
    ProjectManager.qm.getOneByProjectIdAndUserId.mockResolvedValueOnce(null);
    await expect(call(updateController, { id: 'p1', name: 'New' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1', ownerProjectManagerId: null });
    currentUser.role = User.Roles.ADMIN;
    ProjectManager.qm.getOneByProjectIdAndUserId.mockResolvedValueOnce({ id: 'pm1' });
    ProjectManager.qm.getOneById.mockResolvedValueOnce(null);
    await expect(
      call(updateController, { id: 'p1', ownerProjectManagerId: 'pm2' }),
    ).rejects.toEqual({
      ownerProjectManagerNotFound: 'Owner project manager not found',
    });

    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1', ownerProjectManagerId: null });
    ProjectManager.qm.getOneByProjectIdAndUserId.mockResolvedValueOnce({ id: 'pm1' });
    BackgroundImage.qm.getOneById.mockResolvedValueOnce(null);
    await expect(call(updateController, { id: 'p1', backgroundImageId: 'bg2' })).rejects.toEqual({
      backgroundImageNotFound: 'Background image not found',
    });
  });

  test('projects/update blocks favorite changes for non-members', async () => {
    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1', ownerProjectManagerId: 'pm1' });
    ProjectManager.qm.getOneByProjectIdAndUserId.mockResolvedValueOnce(null);
    sails.helpers.projects.getBoardMembershipsTotalByIdAndUserId.mockResolvedValueOnce(0);

    await expect(call(updateController, { id: 'p1', isFavorite: true })).rejects.toEqual({
      projectNotFound: 'Project not found',
    });
  });

  test('projects/update handles helper intercept errors', async () => {
    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1', ownerProjectManagerId: null });
    ProjectManager.qm.getOneByProjectIdAndUserId.mockResolvedValueOnce({ id: 'pm1' });
    sails.helpers.projects.updateOne.with.mockReturnValueOnce(
      makeChainable(null, 'ownerProjectManagerInValuesMustBeLastManager', () => true),
    );

    await expect(call(updateController, { id: 'p1', name: 'New' })).rejects.toEqual({
      ownerProjectManagerMustBeLastManager: 'Owner project manager must be last manager',
    });
  });

  test('projects/update toggles scrum settings', async () => {
    Project.qm.getOneById.mockResolvedValueOnce({
      id: 'p1',
      ownerProjectManagerId: null,
      useScrum: false,
    });
    ProjectManager.qm.getOneByProjectIdAndUserId.mockResolvedValueOnce({ id: 'pm1' });
    sails.helpers.projects.updateOne.with.mockReturnValueOnce(
      makeChainable({ id: 'p1', useScrum: true }),
    );
    Board.qm.getByProjectId.mockResolvedValueOnce([{ id: 'b1' }, { id: 'b2' }]);

    const result = await call(updateController, { id: 'p1', useScrum: true });

    expect(sails.helpers.boards.updateOne.with).toHaveBeenCalledTimes(2);
    expect(sails.helpers.projects.deleteScrumBoards.with).toHaveBeenCalled();
    expect(sails.helpers.projects.createScrumBoards.with).toHaveBeenCalled();
    expect(result).toEqual({ item: { id: 'p1', useScrum: true } });
  });

  test('projects/start-sprint enforces rights and scrum enabled', async () => {
    Project.qm.getOneById.mockResolvedValueOnce(null);
    await expect(call(startSprintController, { projectId: 'p1' })).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1', useScrum: true });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(call(startSprintController, { projectId: 'p1' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1', useScrum: false });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    await expect(call(startSprintController, { projectId: 'p1' })).rejects.toEqual({
      scrumNotEnabled: 'Scrum not enabled for project',
    });
  });

  test('projects/start-sprint returns sprint', async () => {
    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1', useScrum: true });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);

    const result = await call(startSprintController, { projectId: 'p1' });

    expect(result).toEqual({ item: { id: 's1' } });
  });
});
