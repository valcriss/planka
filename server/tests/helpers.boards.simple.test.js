const getCardIds = require('../api/helpers/boards/get-card-ids');
const getFiniteListsById = require('../api/helpers/boards/get-finite-lists-by-id');
const getMemberUserIds = require('../api/helpers/boards/get-member-user-ids');
const getSubscriptionUserIds = require('../api/helpers/boards/get-subscription-user-ids');
const getPathToProjectById = require('../api/helpers/boards/get-path-to-project-by-id');

const originalSails = global.sails;
const originalCard = global.Card;
const originalList = global.List;
const originalBoardMembership = global.BoardMembership;
const originalBoardSubscription = global.BoardSubscription;
const originalBoard = global.Board;
const originalProject = global.Project;

describe('helpers/boards simple helpers', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        utils: {
          mapRecords: jest.fn().mockReturnValue(['id-1', 'id-2']),
        },
      },
    };

    global.Card = {
      qm: {
        getByBoardId: jest.fn().mockResolvedValue([{ id: 'card-1' }]),
      },
    };

    global.List = {
      FINITE_TYPES: ['finite'],
      qm: {
        getByBoardId: jest.fn().mockResolvedValue([{ id: 'list-1' }]),
      },
    };

    global.BoardMembership = {
      qm: {
        getByBoardId: jest.fn().mockResolvedValue([{ userId: 'user-1' }]),
      },
    };

    global.BoardSubscription = {
      qm: {
        getByBoardId: jest.fn().mockResolvedValue([{ userId: 'user-2' }]),
      },
    };

    global.Board = {
      qm: {
        getOneById: jest.fn(),
      },
    };

    global.Project = {
      qm: {
        getOneById: jest.fn(),
      },
    };
  });

  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }

    if (typeof originalCard === 'undefined') {
      delete global.Card;
    } else {
      global.Card = originalCard;
    }

    if (typeof originalList === 'undefined') {
      delete global.List;
    } else {
      global.List = originalList;
    }

    if (typeof originalBoardMembership === 'undefined') {
      delete global.BoardMembership;
    } else {
      global.BoardMembership = originalBoardMembership;
    }

    if (typeof originalBoardSubscription === 'undefined') {
      delete global.BoardSubscription;
    } else {
      global.BoardSubscription = originalBoardSubscription;
    }

    if (typeof originalBoard === 'undefined') {
      delete global.Board;
    } else {
      global.Board = originalBoard;
    }

    if (typeof originalProject === 'undefined') {
      delete global.Project;
    } else {
      global.Project = originalProject;
    }
  });

  test('returns card ids by board', async () => {
    const result = await getCardIds.fn({ id: 'board-1' });

    expect(Card.qm.getByBoardId).toHaveBeenCalledWith('board-1');
    expect(sails.helpers.utils.mapRecords).toHaveBeenCalled();
    expect(result).toEqual(['id-1', 'id-2']);
  });

  test('returns finite lists by board id', async () => {
    const result = await getFiniteListsById.fn({
      id: 'board-1',
      exceptListIdOrIds: ['list-1'],
    });

    expect(List.qm.getByBoardId).toHaveBeenCalledWith('board-1', {
      exceptIdOrIds: ['list-1'],
      typeOrTypes: ['finite'],
    });
    expect(result).toEqual([{ id: 'list-1' }]);
  });

  test('returns member user ids', async () => {
    const result = await getMemberUserIds.fn({ id: 'board-1' });

    expect(BoardMembership.qm.getByBoardId).toHaveBeenCalledWith('board-1');
    expect(sails.helpers.utils.mapRecords).toHaveBeenCalledWith([{ userId: 'user-1' }], 'userId');
    expect(result).toEqual(['id-1', 'id-2']);
  });

  test('returns subscription user ids', async () => {
    const result = await getSubscriptionUserIds.fn({
      id: 'board-1',
      exceptUserIdOrIds: ['u1'],
    });

    expect(BoardSubscription.qm.getByBoardId).toHaveBeenCalledWith('board-1', {
      exceptUserIdOrIds: ['u1'],
    });
    expect(result).toEqual(['id-1', 'id-2']);
  });

  test('returns path to project and board', async () => {
    Board.qm.getOneById.mockResolvedValue({
      id: 'board-1',
      projectId: 'project-1',
    });
    Project.qm.getOneById.mockResolvedValue({ id: 'project-1' });

    const result = await getPathToProjectById.fn({ id: 'board-1' });

    expect(result).toEqual({
      board: { id: 'board-1', projectId: 'project-1' },
      project: { id: 'project-1' },
    });
  });

  test('throws pathNotFound when board missing', async () => {
    Board.qm.getOneById.mockResolvedValue(null);

    await expect(getPathToProjectById.fn({ id: 'board-x' })).rejects.toBe('pathNotFound');
  });

  test('throws pathNotFound when project missing', async () => {
    Board.qm.getOneById.mockResolvedValue({
      id: 'board-2',
      projectId: 'project-2',
    });
    Project.qm.getOneById.mockResolvedValue(null);

    await expect(getPathToProjectById.fn({ id: 'board-2' })).rejects.toEqual({
      pathNotFound: {
        board: { id: 'board-2', projectId: 'project-2' },
      },
    });
  });
});
