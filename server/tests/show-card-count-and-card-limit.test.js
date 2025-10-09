const lodash = require('lodash');

const originalGlobals = {
  _: global._,
  Board: global.Board,
  List: global.List,
  Project: global.Project,
  BoardMembership: global.BoardMembership,
  ProjectManager: global.ProjectManager,
  BackgroundImage: global.BackgroundImage,
  User: global.User,
  sails: global.sails,
  BoardSubscription: global.BoardSubscription,
};

global._ = lodash;

global.Board = global.Board || {
  Views: { KANBAN: 'kanban', GRID: 'grid', LIST: 'list' },
  SwimlaneTypes: { NONE: 'none', MEMBERS: 'members', LABELS: 'labels', EPICS: 'epics' },
  qm: {},
};

global.List = global.List || {
  FINITE_TYPES: ['active', 'closed'],
  Types: { ACTIVE: 'active', CLOSED: 'closed' },
};

global.Project = global.Project || {
  BackgroundTypes: { COLOR: 'color' },
  BACKGROUND_GRADIENTS: ['gradient'],
  Types: { PRIVATE: 'private', SHARED: 'shared' },
  qm: {},
};

global.BoardMembership = global.BoardMembership || {
  Roles: { EDITOR: 'editor' },
  qm: {},
};

global.ProjectManager = global.ProjectManager || { qm: {} };

global.BackgroundImage = global.BackgroundImage || { qm: {} };

global.User = global.User || { Roles: { ADMIN: 'admin' } };

global.BoardSubscription = global.BoardSubscription || {
  qm: {
    createOne: jest.fn(),
    deleteOne: jest.fn(),
  },
};

global.sails = global.sails || {
  helpers: {},
  sockets: { broadcast: jest.fn() },
};

const boardsUpdateController = require('../api/controllers/boards/update');
const listsUpdateController = require('../api/controllers/lists/update');
const projectsUpdateController = require('../api/controllers/projects/update');

const createResolvedMachine = (result) => {
  const machine = {
    intercept: jest.fn(() => machine),
    then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected) => Promise.resolve(result).catch(onRejected),
  };

  return machine;
};

describe('showCardCount and cardLimit updates', () => {
  beforeEach(() => {
    global._ = lodash;

    global.Board = {
      Views: { KANBAN: 'kanban', GRID: 'grid', LIST: 'list' },
      SwimlaneTypes: { NONE: 'none', MEMBERS: 'members', LABELS: 'labels', EPICS: 'epics' },
      qm: {
        getByProjectId: jest.fn(),
      },
    };

    global.List = {
      FINITE_TYPES: ['active', 'closed'],
      Types: { ACTIVE: 'active', CLOSED: 'closed' },
    };

    global.BoardMembership = {
      Roles: { EDITOR: 'editor' },
      qm: {
        getOneByBoardIdAndUserId: jest.fn(),
      },
    };

    global.Project = {
      BackgroundTypes: { COLOR: 'color' },
      BACKGROUND_GRADIENTS: ['gradient'],
      Types: { PRIVATE: 'private', SHARED: 'shared' },
      qm: {
        getOneById: jest.fn(),
      },
    };

    global.ProjectManager = {
      qm: {
        getOneByProjectIdAndUserId: jest.fn(),
        getOneById: jest.fn(),
      },
    };

    global.BackgroundImage = {
      qm: {
        getOneById: jest.fn(),
      },
    };

    global.User = {
      Roles: { ADMIN: 'admin' },
    };

    global.BoardSubscription = {
      qm: {
        createOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };

    global.sails = {
      helpers: {
        boards: {
          getPathToProjectById: jest.fn(),
          updateOne: { with: jest.fn() },
        },
        users: {
          isProjectManager: jest.fn(),
          isBoardMember: jest.fn(),
        },
        lists: {
          getPathToProjectById: jest.fn(),
          isFinite: jest.fn(),
          updateOne: { with: jest.fn() },
        },
        cardTypes: {
          getOrCreateForProject: { with: jest.fn() },
        },
        projects: {
          updateOne: { with: jest.fn() },
          deleteScrumBoards: { with: jest.fn().mockResolvedValue() },
          createScrumBoards: { with: jest.fn().mockResolvedValue() },
          getBoardMembershipsTotalByIdAndUserId: jest
            .fn()
            .mockReturnValue(createResolvedMachine(0)),
        },
        utils: {
          makeTranslator: jest.fn(),
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };
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

    if (typeof originalGlobals.Board === 'undefined') {
      delete global.Board;
    } else {
      global.Board = originalGlobals.Board;
    }

    if (typeof originalGlobals.List === 'undefined') {
      delete global.List;
    } else {
      global.List = originalGlobals.List;
    }

    if (typeof originalGlobals.Project === 'undefined') {
      delete global.Project;
    } else {
      global.Project = originalGlobals.Project;
    }

    if (typeof originalGlobals.BoardMembership === 'undefined') {
      delete global.BoardMembership;
    } else {
      global.BoardMembership = originalGlobals.BoardMembership;
    }

    if (typeof originalGlobals.ProjectManager === 'undefined') {
      delete global.ProjectManager;
    } else {
      global.ProjectManager = originalGlobals.ProjectManager;
    }

    if (typeof originalGlobals.BackgroundImage === 'undefined') {
      delete global.BackgroundImage;
    } else {
      global.BackgroundImage = originalGlobals.BackgroundImage;
    }

    if (typeof originalGlobals.User === 'undefined') {
      delete global.User;
    } else {
      global.User = originalGlobals.User;
    }

    if (typeof originalGlobals.BoardSubscription === 'undefined') {
      delete global.BoardSubscription;
    } else {
      global.BoardSubscription = originalGlobals.BoardSubscription;
    }

    if (typeof originalGlobals.sails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalGlobals.sails;
    }
  });

  test('project manager can update showCardCount when scrum disabled', async () => {
    const board = { id: 'board-1', showCardCount: false };
    const project = { id: 'project-1', useScrum: false };
    const updatedBoard = { ...board, showCardCount: true };

    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      createResolvedMachine({ board, project }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.users.isBoardMember.mockResolvedValue(false);
    sails.helpers.boards.updateOne.with.mockReturnValue(createResolvedMachine(updatedBoard));

    const context = {
      req: {
        currentUser: { id: 'user-1' },
      },
    };

    const result = await boardsUpdateController.fn.call(context, {
      id: board.id,
      showCardCount: true,
    });

    expect(sails.helpers.boards.updateOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({ showCardCount: true }),
      }),
    );
    expect(result.item).toEqual(updatedBoard);
  });

  test('showCardCount forced to false when scrum enabled', async () => {
    const board = { id: 'board-1', showCardCount: true };
    const project = { id: 'project-1', useScrum: true };
    const updatedBoard = { ...board, showCardCount: false };

    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      createResolvedMachine({ board, project }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.users.isBoardMember.mockResolvedValue(false);
    sails.helpers.boards.updateOne.with.mockReturnValue(createResolvedMachine(updatedBoard));

    const context = {
      req: {
        currentUser: { id: 'user-1' },
      },
    };

    const result = await boardsUpdateController.fn.call(context, {
      id: board.id,
      showCardCount: true,
    });

    expect(sails.helpers.boards.updateOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({ showCardCount: false }),
      }),
    );
    expect(result.item.showCardCount).toBe(false);
  });

  test('cardLimit is parsed and forwarded on list update', async () => {
    const list = { id: 'list-1', cardLimit: 0 };
    const board = { id: 'board-1' };
    const project = { id: 'project-1' };
    const boardMembership = { role: BoardMembership.Roles.EDITOR };
    const updatedList = { ...list, cardLimit: 5 };

    sails.helpers.lists.getPathToProjectById.mockReturnValue(
      createResolvedMachine({ list, board, project }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(boardMembership);
    sails.helpers.lists.isFinite.mockReturnValue(true);
    sails.helpers.lists.updateOne.with.mockReturnValue(createResolvedMachine(updatedList));

    const context = {
      req: {
        currentUser: { id: 'user-1' },
      },
    };

    const result = await listsUpdateController.fn.call(context, {
      id: list.id,
      cardLimit: '5',
    });

    expect(sails.helpers.lists.updateOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({ cardLimit: 5 }),
      }),
    );
    expect(result.item.cardLimit).toBe(5);
  });

  test('rejects negative cardLimit values', async () => {
    const list = { id: 'list-1', cardLimit: 0 };
    const board = { id: 'board-1' };
    const project = { id: 'project-1' };
    const boardMembership = { role: BoardMembership.Roles.EDITOR };

    sails.helpers.lists.getPathToProjectById.mockReturnValue(
      createResolvedMachine({ list, board, project }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(boardMembership);
    sails.helpers.lists.isFinite.mockReturnValue(true);

    const context = {
      req: {
        currentUser: { id: 'user-1' },
      },
    };

    await expect(
      listsUpdateController.fn.call(context, {
        id: list.id,
        cardLimit: -1,
      }),
    ).rejects.toEqual({ invalidCardLimit: 'Invalid card limit' });
    expect(sails.helpers.lists.updateOne.with).not.toHaveBeenCalled();
  });

  test('enabling scrum resets showCardCount before scrum boards adjustments', async () => {
    const project = { id: 'project-1', useScrum: false, ownerProjectManagerId: null };
    const updatedProject = { ...project, useScrum: true };
    const boards = [
      { id: 'board-1', showCardCount: true },
      { id: 'board-2', showCardCount: false },
    ];

    Project.qm.getOneById.mockResolvedValue(project);
    ProjectManager.qm.getOneByProjectIdAndUserId.mockResolvedValue(null);
    sails.helpers.projects.updateOne.with.mockReturnValue(createResolvedMachine(updatedProject));
    Board.qm.getByProjectId.mockResolvedValue(boards);
    sails.helpers.boards.updateOne.with.mockImplementation(({ record }) =>
      createResolvedMachine({ ...record, showCardCount: false }),
    );

    const context = {
      req: {
        currentUser: { id: 'user-1', role: User.Roles.ADMIN },
      },
    };

    const result = await projectsUpdateController.fn.call(context, {
      id: project.id,
      useScrum: true,
    });

    expect(Board.qm.getByProjectId).toHaveBeenCalledWith(project.id);
    expect(sails.helpers.boards.updateOne.with).toHaveBeenCalledTimes(boards.length);
    boards.forEach((board) => {
      expect(sails.helpers.boards.updateOne.with).toHaveBeenCalledWith(
        expect.objectContaining({
          record: board,
          values: { showCardCount: false },
        }),
      );
    });

    const updateInvocationOrder = sails.helpers.boards.updateOne.with.mock.invocationCallOrder[0];
    expect(updateInvocationOrder).toBeLessThan(
      sails.helpers.projects.deleteScrumBoards.with.mock.invocationCallOrder[0],
    );
    expect(updateInvocationOrder).toBeLessThan(
      sails.helpers.projects.createScrumBoards.with.mock.invocationCallOrder[0],
    );

    expect(result.item).toEqual(updatedProject);
  });
});
