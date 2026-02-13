const lodash = require('lodash');
const createBoard = require('../api/helpers/boards/create-one');
const updateBoard = require('../api/helpers/boards/update-one');
const deleteBoard = require('../api/helpers/boards/delete-one');

const originalSails = global.sails;
const originalBoard = global.Board;
const originalWebhook = global.Webhook;
const originalBoardSubscription = global.BoardSubscription;
const originalLodash = global._;
describe('helpers/boards create/update/delete', () => {
  beforeEach(() => {
    global._ = lodash;
    const scoper = {
      getUserIdsWithFullProjectVisibility: jest.fn().mockResolvedValue(['user-1']),
      getBoardRelatedUserIds: jest.fn().mockResolvedValue(['user-1', 'user-2']),
      replaceBoard: jest.fn(),
      clone: jest.fn(),
    };
    scoper.clone.mockReturnValue(scoper);
    global.sails = {
      helpers: {
        projects: {
          makeScoper: {
            with: jest.fn().mockReturnValue(scoper),
          },
        },
        utils: {
          insertToPositionables: jest.fn().mockReturnValue({ position: 10, repositions: [] }),
          sendWebhooks: {
            with: jest.fn(),
          },
        },
        users: {
          isBoardSubscriber: jest.fn().mockResolvedValue(false),
        },
        boards: {
          deleteRelated: jest.fn().mockResolvedValue({ boardMemberships: [] }),
          importFromPlanner: {
            with: jest.fn(),
          },
          importFromTrello: jest.fn(),
        },
      },
      sockets: {
        broadcast: jest.fn(),
        removeRoomMembersFromRooms: jest.fn(),
      },
    };
    global.Board = {
      ImportTypes: {
        TRELLO: 'trello',
        PLANNER: 'planner',
      },
      qm: {
        getByProjectId: jest.fn().mockResolvedValue([]),
        getOneByProjectIdAndSlug: jest.fn().mockResolvedValue(null),
        createOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
    global.Webhook = {
      Events: {
        BOARD_CREATE: 'boardCreate',
        BOARD_UPDATE: 'boardUpdate',
        BOARD_DELETE: 'boardDelete',
      },
      qm: {
        getAll: jest.fn().mockResolvedValue([{ id: 'wh-1' }]),
      },
    };
    global.BoardSubscription = {
      qm: {
        createOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
  });
  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }
    if (typeof originalBoard === 'undefined') {
      delete global.Board;
    } else {
      global.Board = originalBoard;
    }
    if (typeof originalWebhook === 'undefined') {
      delete global.Webhook;
    } else {
      global.Webhook = originalWebhook;
    }
    if (typeof originalBoardSubscription === 'undefined') {
      delete global.BoardSubscription;
    } else {
      global.BoardSubscription = originalBoardSubscription;
    }
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('creates board and sends webhooks', async () => {
    Board.qm.createOne.mockResolvedValue({
      board: { id: 'board-1', projectId: 'project-1' },
      boardMembership: { id: 'bm-1', userId: 'user-1' },
      lists: [],
    });
    const result = await createBoard.fn({
      values: { name: 'Board', project: { id: 'project-1', useScrum: true } },
      actorUser: { id: 'actor-1' },
      requestId: 'req-1',
      request: { id: 'req-1' },
    });
    expect(result.board).toEqual({ id: 'board-1', projectId: 'project-1' });
    expect(Board.qm.createOne).toHaveBeenCalled();
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('updates board name and sends webhooks', async () => {
    Board.qm.updateOne.mockResolvedValue({
      id: 'board-2',
      projectId: 'project-1',
      slug: 'new',
    });
    const result = await updateBoard.fn({
      record: { id: 'board-2', projectId: 'project-1', slug: 'old' },
      values: { name: 'New' },
      project: { id: 'project-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-2' },
    });
    expect(result).toEqual({
      id: 'board-2',
      projectId: 'project-1',
      slug: 'new',
    });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('updates subscription status when isSubscribed changes', async () => {
    const record = { id: 'board-3', projectId: 'project-1' };
    const result = await updateBoard.fn({
      record,
      values: { isSubscribed: true },
      project: { id: 'project-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-3' },
    });
    expect(result).toBe(record);
    expect(BoardSubscription.qm.createOne).toHaveBeenCalledWith({
      boardId: 'board-3',
      userId: 'actor-1',
    });
  });
  test('deletes board and sends webhooks', async () => {
    Board.qm.deleteOne.mockResolvedValue({ id: 'board-4' });
    sails.helpers.boards.deleteRelated.mockResolvedValue({
      boardMemberships: [],
    });
    const result = await deleteBoard.fn({
      record: { id: 'board-4' },
      project: { id: 'project-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-4' },
    });
    expect(result).toEqual({ id: 'board-4' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
});
