const lodash = require('lodash');

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'temp-room'),
}));

const deleteBoardMembership = require('../api/helpers/board-memberships/delete-one');
const updateBoardMembership = require('../api/helpers/board-memberships/update-one');
const getPathToProjectById = require('../api/helpers/board-memberships/get-path-to-project-by-id');

const originalSails = global.sails;
const originalBoardMembership = global.BoardMembership;
const originalBoardSubscription = global.BoardSubscription;
const originalCardSubscription = global.CardSubscription;
const originalCardMembership = global.CardMembership;
const originalTaskList = global.TaskList;
const originalTask = global.Task;
const originalUser = global.User;
const originalWebhook = global.Webhook;
const originalLodash = global._;

describe('helpers/board-memberships lifecycle', () => {
  beforeEach(() => {
    global._ = lodash;

    global.sails = {
      helpers: {
        boards: {
          getCardIds: jest.fn().mockResolvedValue(['card-1']),
          getPathToProjectById: jest.fn(),
        },
        users: {
          isProjectManager: jest.fn().mockResolvedValue(false),
          presentOne: jest.fn((user) => ({ id: user.id })),
        },
        utils: {
          mapRecords: jest.fn((records) => records.map((record) => record.id)),
          sendWebhooks: {
            with: jest.fn(),
          },
        },
      },
      sockets: {
        broadcast: jest.fn(),
        addRoomMembersToRooms: jest.fn((_from, _to, cb) => cb()),
        removeRoomMembersFromRooms: jest.fn((_from, _to, cb) => {
          if (typeof cb === 'function') {
            cb();
          }
        }),
      },
    };

    global.BoardSubscription = {
      qm: {
        delete: jest.fn().mockResolvedValue(),
      },
    };

    global.CardSubscription = {
      qm: {
        delete: jest.fn().mockResolvedValue(),
      },
    };

    global.CardMembership = {
      qm: {
        delete: jest.fn().mockResolvedValue(),
      },
    };

    global.TaskList = {
      qm: {
        getByCardIds: jest.fn().mockResolvedValue([{ id: 'task-list-1' }]),
      },
    };

    global.Task = {
      qm: {
        update: jest.fn().mockResolvedValue([]),
      },
    };

    global.BoardMembership = {
      SHARED_RULES: {
        canEdit: {
          setTo: true,
        },
      },
      RULES_BY_ROLE: {
        member: {
          role: {
            setTo: 'member',
          },
        },
      },
      qm: {
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
        getOneById: jest.fn(),
      },
    };

    global.User = {
      Roles: {
        ADMIN: 'admin',
      },
    };

    global.Webhook = {
      Events: {
        BOARD_MEMBERSHIP_UPDATE: 'boardMembershipUpdate',
        BOARD_MEMBERSHIP_DELETE: 'boardMembershipDelete',
      },
      qm: {
        getAll: jest.fn().mockResolvedValue([{ id: 'wh-1' }]),
      },
    };
  });

  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
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

    if (typeof originalCardSubscription === 'undefined') {
      delete global.CardSubscription;
    } else {
      global.CardSubscription = originalCardSubscription;
    }

    if (typeof originalCardMembership === 'undefined') {
      delete global.CardMembership;
    } else {
      global.CardMembership = originalCardMembership;
    }

    if (typeof originalTaskList === 'undefined') {
      delete global.TaskList;
    } else {
      global.TaskList = originalTaskList;
    }

    if (typeof originalTask === 'undefined') {
      delete global.Task;
    } else {
      global.Task = originalTask;
    }

    if (typeof originalUser === 'undefined') {
      delete global.User;
    } else {
      global.User = originalUser;
    }

    if (typeof originalWebhook === 'undefined') {
      delete global.Webhook;
    } else {
      global.Webhook = originalWebhook;
    }

    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });

  test('updates board membership and sends webhooks', async () => {
    BoardMembership.qm.updateOne.mockResolvedValue({
      id: 'bm-1',
      userId: 'user-1',
      boardId: 'board-1',
    });

    const result = await updateBoardMembership.fn({
      record: { id: 'bm-1', role: 'viewer', canEdit: false },
      values: { role: 'member' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });

    expect(result).toEqual({
      id: 'bm-1',
      userId: 'user-1',
      boardId: 'board-1',
    });
    expect(BoardMembership.qm.updateOne).toHaveBeenCalledWith('bm-1', {
      canEdit: true,
      role: 'member',
    });
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'user:user-1',
      'boardMembershipUpdate',
      { item: { id: 'bm-1', userId: 'user-1', boardId: 'board-1' } },
      { id: 'req-1' },
    );
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'temp-room',
      'boardMembershipUpdate',
      { item: { id: 'bm-1', userId: 'user-1', boardId: 'board-1' } },
      { id: 'req-1' },
    );
    const webhookCall = sails.helpers.utils.sendWebhooks.with.mock.calls[0][0];
    expect(webhookCall.buildPrevData().item).toEqual({
      id: 'bm-1',
      role: 'viewer',
      canEdit: false,
    });
  });

  test('returns null when update fails', async () => {
    BoardMembership.qm.updateOne.mockResolvedValue(null);

    const result = await updateBoardMembership.fn({
      record: { id: 'bm-2', role: 'member' },
      values: { role: 'member' },
      project: { id: 'project-2' },
      board: { id: 'board-2' },
      actorUser: { id: 'actor-2' },
    });

    expect(result).toBeNull();
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });

  test('deletes board membership and cleans related data', async () => {
    BoardMembership.qm.deleteOne.mockResolvedValue({
      id: 'bm-3',
      userId: 'user-3',
      boardId: 'board-3',
    });

    const result = await deleteBoardMembership.fn({
      record: { id: 'bm-3', boardId: 'board-3' },
      user: { id: 'user-3', role: 'member' },
      project: { id: 'project-3', ownerProjectManagerId: null },
      board: { id: 'board-3' },
      actorUser: { id: 'actor-3' },
      request: { id: 'req-3' },
    });

    expect(result).toEqual({
      id: 'bm-3',
      userId: 'user-3',
      boardId: 'board-3',
    });
    expect(BoardSubscription.qm.delete).toHaveBeenCalledWith({
      boardId: 'board-3',
      userId: 'user-3',
    });
    expect(CardSubscription.qm.delete).toHaveBeenCalledWith({
      cardId: ['card-1'],
      userId: 'user-3',
    });
    expect(Task.qm.update).toHaveBeenCalledWith(
      { taskListId: ['task-list-1'], assigneeUserId: 'user-3' },
      { assigneeUserId: null },
    );
    expect(sails.sockets.removeRoomMembersFromRooms).toHaveBeenCalledWith(
      '@user:user-3',
      'board:board-3',
    );
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'user:user-3',
      'boardMembershipDelete',
      { item: { id: 'bm-3', userId: 'user-3', boardId: 'board-3' } },
      { id: 'req-3' },
    );
  });

  test('returns null when delete fails', async () => {
    BoardMembership.qm.deleteOne.mockResolvedValue(null);

    const result = await deleteBoardMembership.fn({
      record: { id: 'bm-4', boardId: 'board-4' },
      user: { id: 'user-4', role: 'member' },
      project: { id: 'project-4', ownerProjectManagerId: null },
      board: { id: 'board-4' },
      actorUser: { id: 'actor-4' },
    });

    expect(result).toBeNull();
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });

  test('returns path to project for board membership', async () => {
    BoardMembership.qm.getOneById.mockResolvedValue({
      id: 'bm-5',
      boardId: 'board-5',
    });

    sails.helpers.boards.getPathToProjectById.mockReturnValue({
      intercept: jest.fn().mockResolvedValue({
        board: { id: 'board-5' },
        project: { id: 'project-5' },
      }),
    });

    const result = await getPathToProjectById.fn({ id: 'bm-5' });

    expect(result).toEqual({
      boardMembership: { id: 'bm-5', boardId: 'board-5' },
      board: { id: 'board-5' },
      project: { id: 'project-5' },
    });
  });

  test('throws pathNotFound when board membership is missing', async () => {
    BoardMembership.qm.getOneById.mockResolvedValue(null);

    await expect(getPathToProjectById.fn({ id: 'bm-6' })).rejects.toBe('pathNotFound');
  });

  test('throws pathNotFound when board path is missing', async () => {
    BoardMembership.qm.getOneById.mockResolvedValue({
      id: 'bm-7',
      boardId: 'board-7',
    });

    sails.helpers.boards.getPathToProjectById.mockReturnValue({
      intercept: jest
        .fn()
        .mockImplementation((_name, handler) =>
          Promise.reject(handler({ board: { id: 'board-7' } })),
        ),
    });

    await expect(getPathToProjectById.fn({ id: 'bm-7' })).rejects.toEqual({
      pathNotFound: {
        boardMembership: { id: 'bm-7', boardId: 'board-7' },
        board: { id: 'board-7' },
      },
    });
  });
});
