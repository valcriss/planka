const lodash = require('lodash');

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

const createDefaultSails = () => ({
  config: {
    custom: {
      personalProjectOwnerLimit: null,
      personnalProjectOwnerLimit: null,
    },
  },
  helpers: {
    utils: {
      makeTranslator: () => (key) => key,
    },
    users: {
      getPersonalProjectsTotalById: async () => 0,
      getPersonalProjectOwnerLimit: () => null,
    },
    projects: {
      createOne: {
        with: async () => {},
      },
    },
    boards: {
      createOne: {
        with: async () => {},
      },
    },
    lists: {
      createOne: {
        with: async () => {},
      },
    },
  },
});

global._ = lodash;
global.User = global.User || defaultUser;
global.Project = global.Project || defaultProject;
global.List = global.List || defaultList;
global.sails = global.sails || createDefaultSails();

const createProjectController = require('../api/controllers/projects/create');

describe('projects/create personal project owner restrictions', () => {
  const identityTranslator = (key) => key;

  const makeContext = (overrides = {}) => ({
    req: {
      currentUser: {
        id: 1,
        role: User.Roles.PERSONAL_PROJECT_OWNER,
        language: 'en',
        ...overrides.currentUser,
      },
      getLocale: jest.fn().mockReturnValue('en'),
      ...overrides.req,
    },
  });

  const resetGlobalsForTest = () => {
    global._ = lodash;

    global.User = {
      Roles: { ...defaultUser.Roles },
    };

    global.Project = {
      Types: { ...defaultProject.Types },
    };

    global.List = {
      Types: { ...defaultList.Types },
    };

    global.sails = {
      config: {
        custom: {
          personalProjectOwnerLimit: null,
          personnalProjectOwnerLimit: null,
        },
      },
      helpers: {
        utils: {
          makeTranslator: jest.fn().mockReturnValue(identityTranslator),
        },
        users: {
          getPersonalProjectsTotalById: jest.fn(),
          getPersonalProjectOwnerLimit: jest.fn(),
        },
        projects: {
          createOne: {
            with: jest.fn(),
          },
        },
        boards: {
          createOne: {
            with: jest.fn(),
          },
        },
        lists: {
          createOne: {
            with: jest.fn(),
          },
        },
      },
    };
  };

  beforeEach(() => {
    resetGlobalsForTest();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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

  test('throws when personal project owner tries to create shared project', async () => {
    const context = makeContext();
    const inputs = {
      type: Project.Types.SHARED,
      name: 'Shared project',
      code: 'SP',
      description: null,
      template: 'none',
      sprintDuration: 2,
    };

    await expect(createProjectController.fn.call(context, inputs)).rejects.toEqual({
      invalidType: 'Invalid type',
    });

    expect(global.sails.helpers.users.getPersonalProjectsTotalById).not.toHaveBeenCalled();
    expect(global.sails.helpers.projects.createOne.with).not.toHaveBeenCalled();
  });

  test('throws when personal project owner exceeds project limit', async () => {
    const context = makeContext();

    global.sails.helpers.users.getPersonalProjectOwnerLimit.mockReturnValue(2);
    global.sails.helpers.users.getPersonalProjectsTotalById.mockResolvedValue(2);

    const inputs = {
      type: Project.Types.PRIVATE,
      name: 'Private project',
      code: 'PP',
      description: null,
      template: 'none',
      sprintDuration: 2,
    };

    await expect(createProjectController.fn.call(context, inputs)).rejects.toEqual({
      personalProjectsLimitReached: 'Personal projects limit reached',
    });

    expect(global.sails.helpers.users.getPersonalProjectOwnerLimit).toHaveBeenCalled();
    expect(global.sails.helpers.users.getPersonalProjectsTotalById).toHaveBeenCalledWith(
      context.req.currentUser.id,
    );
    expect(global.sails.helpers.projects.createOne.with).not.toHaveBeenCalled();
  });

  test('allows personal project owner to create project when under limit', async () => {
    const context = makeContext();

    global.sails.helpers.users.getPersonalProjectOwnerLimit.mockReturnValue(3);
    global.sails.helpers.users.getPersonalProjectsTotalById.mockResolvedValue(2);
    global.sails.helpers.projects.createOne.with.mockResolvedValue({
      project: { id: 1 },
      projectManager: { id: 2 },
    });

    const inputs = {
      type: Project.Types.PRIVATE,
      name: 'Another private project',
      code: 'APP',
      description: null,
      template: 'none',
      sprintDuration: 2,
    };

    await expect(createProjectController.fn.call(context, inputs)).resolves.toEqual({
      item: { id: 1 },
      included: {
        projectManagers: [{ id: 2 }],
      },
    });

    expect(global.sails.helpers.users.getPersonalProjectOwnerLimit).toHaveBeenCalled();
    expect(global.sails.helpers.users.getPersonalProjectsTotalById).toHaveBeenCalledWith(
      context.req.currentUser.id,
    );
    expect(global.sails.helpers.projects.createOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({ type: Project.Types.PRIVATE }),
      }),
    );
  });
});
