const lodash = require('lodash');
const createBoardMembership = require('../api/helpers/board-memberships/create-one');

const originalSails = global.sails;
const originalBoardMembership = global.BoardMembership;
const originalWebhook = global.Webhook;
const originalLodash = global._;
describe('helpers/board-memberships/create-one', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      helpers: {
        users: {
          presentOne: jest.fn((user) => ({ id: user.id })),
        },
        utils: {
          sendWebhooks: {
            with: jest.fn(),
          },
        },
      },
      sockets: {
        broadcast: jest.fn(),
        addRoomMembersToRooms: jest.fn((from, to, cb) => cb()),
        removeRoomMembersFromRooms: jest.fn((from, to, cb) => cb && cb()),
      },
    };
    global.BoardMembership = {
      SHARED_RULES: {},
      RULES_BY_ROLE: {
        editor: {},
      },
      qm: {
        createOne: jest.fn(),
      },
    };
    global.Webhook = {
      Events: {
        BOARD_MEMBERSHIP_CREATE: 'boardMembershipCreate',
      },
      qm: {
        getAll: jest.fn(),
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
  test('creates board membership and broadcasts to sockets', async () => {
    const boardMembership = {
      id: 'bm-1',
      boardId: 'board-1',
      userId: 'user-2',
    };
    BoardMembership.qm.createOne.mockResolvedValue(boardMembership);
    Webhook.qm.getAll.mockResolvedValue([{ id: 'wh-1' }]);
    const inputs = {
      values: {
        role: 'editor',
        board: { id: 'board-1', projectId: 'project-1' },
        user: { id: 'user-2', name: 'User 2' },
      },
      project: { id: 'project-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    };
    const result = await createBoardMembership.fn(inputs);
    expect(result).toBe(boardMembership);
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'user:user-2',
      'boardMembershipCreate',
      { item: boardMembership },
      inputs.request,
    );
    expect(sails.sockets.addRoomMembersToRooms).toHaveBeenCalledWith(
      'board:board-1',
      expect.any(String),
      expect.any(Function),
    );
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalledTimes(1);
  });
  test('throws userAlreadyBoardMember on unique constraint error', async () => {
    BoardMembership.qm.createOne.mockRejectedValue({ code: 'E_UNIQUE' });
    const inputs = {
      values: {
        role: 'editor',
        board: { id: 'board-1', projectId: 'project-1' },
        user: { id: 'user-2' },
      },
      project: { id: 'project-1' },
      actorUser: { id: 'actor-1' },
    };
    await expect(createBoardMembership.fn(inputs)).rejects.toBe('userAlreadyBoardMember');
  });
});
