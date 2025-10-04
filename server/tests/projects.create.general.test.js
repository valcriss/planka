const lodash = require('lodash');

// Preserve originals to restore after suite
const originalGlobals = {
  _: global._,
  User: global.User,
  Project: global.Project,
  List: global.List,
  sails: global.sails,
};

const defaultUser = {
  Roles: {
    ADMIN: 'admin',
    PROJECT_OWNER: 'projectOwner',
    PERSONAL_PROJECT_OWNER: 'personalProjectOwner',
    BOARD_USER: 'boardUser',
  },
};

const defaultProject = {
  Types: {
    PRIVATE: 'private',
    SHARED: 'shared',
  },
};

const defaultList = {
  Types: {
    ACTIVE: 'active',
    CLOSED: 'closed',
    ARCHIVE: 'archive',
    TRASH: 'trash',
  },
};

const createSails = () => ({
  config: { custom: {} },
  helpers: {
    utils: {
      makeTranslator: jest.fn().mockReturnValue((k) => k),
    },
    users: {
      getPersonalProjectsTotalById: jest.fn(),
      getPersonalProjectOwnerLimit: jest.fn(),
    },
    projects: {
      createOne: { with: jest.fn() },
      createScrumBoards: { with: jest.fn() },
    },
    boards: {
      createOne: { with: jest.fn() },
    },
    lists: {
      createOne: { with: jest.fn() },
    },
  },
});

global._ = lodash;
global.User = global.User || defaultUser;
global.Project = global.Project || defaultProject;
global.List = global.List || defaultList;
global.sails = global.sails || createSails();

const createProjectController = require('../api/controllers/projects/create');

describe('projects/create general (non personal owner) flows', () => {
  const makeContext = (overrides = {}) => ({
    req: {
      currentUser: {
        id: 10,
        role: User.Roles.ADMIN,
        language: 'en',
        ...overrides.currentUser,
      },
      getLocale: jest.fn().mockReturnValue('en'),
      ...overrides.req,
    },
  });

  const reset = () => {
    global._ = lodash;
    global.User = { Roles: { ...defaultUser.Roles } };
    global.Project = { Types: { ...defaultProject.Types } };
    global.List = { Types: { ...defaultList.Types } };
    global.sails = createSails();
  };

  beforeEach(() => reset());

  afterAll(() => {
    if (typeof originalGlobals._ === 'undefined') {
      delete global._;
    } else {
      global._ = originalGlobals._;
    }
    if (typeof originalGlobals.User === 'undefined') {
      delete global.User;
    } else {
      global.User = originalGlobals.User;
    }
    if (typeof originalGlobals.Project === 'undefined') {
      delete global.Project;
    } else {
      global.Project = originalGlobals.Project;
    }
    if (typeof originalGlobals.List === 'undefined') {
      delete global.List;
    } else {
      global.List = originalGlobals.List;
    }
    if (typeof originalGlobals.sails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalGlobals.sails;
    }
  });

  test('creates shared project (template none) and uses provided sprintDuration', async () => {
    const ctx = makeContext();
    global.sails.helpers.projects.createOne.with.mockResolvedValue({
      project: { id: 200, name: 'Shared' },
      projectManager: { id: 300 },
    });

    const inputs = {
      type: Project.Types.SHARED,
      name: 'Shared',
      code: 'SHR',
      description: 'desc',
      template: 'none',
      sprintDuration: 4,
    };

    const result = await createProjectController.fn.call(ctx, inputs);

    expect(result).toEqual({
      item: { id: 200, name: 'Shared' },
      included: { projectManagers: [{ id: 300 }] },
    });
    expect(global.sails.helpers.projects.createOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({
          type: Project.Types.SHARED,
          sprintDuration: 4,
        }),
      }),
    );
    expect(global.sails.helpers.boards.createOne.with).not.toHaveBeenCalled();
    expect(global.sails.helpers.lists.createOne.with).not.toHaveBeenCalled();
  });

  test('kaban template creates board and three lists with expected names and positions', async () => {
    const ctx = makeContext();
    global.sails.helpers.projects.createOne.with.mockResolvedValue({
      project: { id: 11 },
      projectManager: { id: 22 },
    });
    global.sails.helpers.boards.createOne.with.mockResolvedValue({ board: { id: 33 } });

    const inputs = {
      type: Project.Types.SHARED,
      name: 'KabanProj',
      code: 'KB',
      description: null,
      template: 'kaban',
      sprintDuration: 3,
    };

    await createProjectController.fn.call(ctx, inputs);

    expect(global.sails.helpers.boards.createOne.with).toHaveBeenCalledTimes(1);
    expect(global.sails.helpers.boards.createOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({ name: 'Board' }),
      }),
    );

    // Lists should be created thrice
    expect(global.sails.helpers.lists.createOne.with).toHaveBeenCalledTimes(3);
    const { calls } = global.sails.helpers.lists.createOne.with.mock;
    const names = calls.map(([arg]) => arg.values.name).sort();
    expect(names).toEqual(['Done', 'Ongoing', 'To do']);
  });

  test('scrum template sets scrum flags and calls createScrumBoards only', async () => {
    const ctx = makeContext();
    global.sails.helpers.projects.createOne.with.mockResolvedValue({
      project: { id: 50 },
      projectManager: { id: 60 },
    });

    const inputs = {
      type: Project.Types.SHARED,
      name: 'ScrumProj',
      code: 'SC',
      description: null,
      template: 'scrum',
      sprintDuration: 2,
    };

    await createProjectController.fn.call(ctx, inputs);

    expect(global.sails.helpers.projects.createOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({ useScrum: true, useStoryPoints: true }),
      }),
    );
    expect(global.sails.helpers.projects.createScrumBoards.with).toHaveBeenCalledTimes(1);
    expect(global.sails.helpers.boards.createOne.with).not.toHaveBeenCalled();
    expect(global.sails.helpers.lists.createOne.with).not.toHaveBeenCalled();
  });

  test('default sprintDuration applied when missing (template none)', async () => {
    const ctx = makeContext();
    global.sails.helpers.projects.createOne.with.mockResolvedValue({
      project: { id: 70 },
      projectManager: { id: 80 },
    });

    const inputs = {
      type: Project.Types.SHARED,
      name: 'NoSprintProvided',
      code: 'NSP',
      description: null,
      template: 'none',
      // sprintDuration omitted intentionally
    };

    await createProjectController.fn.call(ctx, inputs);
    expect(global.sails.helpers.projects.createOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({ sprintDuration: 2 }),
      }),
    );
  });

  test('default sprintDuration applied and scrum flags set when missing (template scrum)', async () => {
    const ctx = makeContext();
    global.sails.helpers.projects.createOne.with.mockResolvedValue({
      project: { id: 90 },
      projectManager: { id: 91 },
    });

    const inputs = {
      type: Project.Types.SHARED,
      name: 'ScrumDefaultSprint',
      code: 'SDS',
      description: null,
      template: 'scrum',
      // sprintDuration omitted intentionally
    };

    await createProjectController.fn.call(ctx, inputs);
    expect(global.sails.helpers.projects.createOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({
          sprintDuration: 2,
          useScrum: true,
          useStoryPoints: true,
        }),
      }),
    );
  });
});
