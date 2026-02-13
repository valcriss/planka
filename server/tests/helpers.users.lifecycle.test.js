const lodash = require('lodash');

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value) => `hashed:${value}`),
}));

const createUser = require('../api/helpers/users/create-one');
const updateUser = require('../api/helpers/users/update-one');
const deleteUser = require('../api/helpers/users/delete-one');
const makeScoper = require('../api/helpers/users/make-scoper');

const originalSails = global.sails;
const originalUser = global.User;
const originalProject = global.Project;
const originalProjectManager = global.ProjectManager;
const originalBoardMembership = global.BoardMembership;
const originalBoard = global.Board;
const originalWebhook = global.Webhook;
const originalLodash = global._;

describe('helpers/users lifecycle', () => {
  beforeEach(() => {
    global._ = lodash;

    const scoper = {
      getPrivateUserRelatedUserIds: jest.fn().mockResolvedValue(['admin-1', 'user-1']),
      getPublicUserRelatedUserIds: jest.fn().mockResolvedValue(['user-2']),
    };

    global.sails = {
      helpers: {
        users: {
          makeScoper: jest.fn().mockReturnValue(scoper),
          presentOne: jest.fn((record) => record),
          removeRelatedFiles: jest.fn(),
          deleteRelated: jest.fn().mockResolvedValue({ projectManagers: [], boardMemberships: [] }),
          getManagerProjectIds: jest.fn().mockResolvedValue(['project-1']),
        },
        projects: {
          getLonelyByIds: jest.fn().mockResolvedValue([{ id: 'project-1' }]),
        },
        projectManagers: {
          createOne: {
            with: jest.fn(),
          },
        },
        utils: {
          sendWebhooks: {
            with: jest.fn(),
          },
          mapRecords: jest.fn((records, key, unique) => {
            const values = key
              ? records.map((record) => record[key])
              : records.map((record) => record.id);
            if (unique) {
              return [...new Set(values)];
            }
            return values;
          }),
        },
      },
      sockets: {
        broadcast: jest.fn(),
        leaveAll: jest.fn(),
        removeRoomMembersFromRooms: jest.fn(),
        addRoomMembersToRooms: jest.fn((room, tempRoom, callback) => {
          if (callback) {
            callback();
          }
        }),
        leave: jest.fn((request, tempRoom, callback) => {
          if (callback) {
            callback();
          }
        }),
      },
    };

    global.User = {
      Roles: {
        ADMIN: 'admin',
        PROJECT_OWNER: 'projectOwner',
      },
      PERSONAL_FIELD_NAMES: ['email', 'name'],
      qm: {
        createOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
        getAll: jest.fn(),
      },
    };

    global.Project = {
      qm: {
        getShared: jest.fn().mockResolvedValue([]),
      },
    };

    global.ProjectManager = {
      qm: {
        getByUserId: jest.fn().mockResolvedValue([{ projectId: 'project-1' }]),
        getByProjectIds: jest.fn().mockResolvedValue([{ userId: 'pm-2' }]),
      },
    };

    global.Board = {
      qm: {
        getByProjectIds: jest.fn().mockResolvedValue([{ id: 'board-1' }]),
      },
    };

    global.BoardMembership = {
      qm: {
        getByProjectIds: jest.fn().mockResolvedValue([{ userId: 'member-1' }]),
        getByUserId: jest.fn().mockResolvedValue([{ boardId: 'board-1' }]),
        getByBoardIds: jest.fn().mockResolvedValue([{ userId: 'member-2' }]),
        getByBoardIdsAndUserId: jest.fn().mockResolvedValue([]),
      },
    };

    global.Webhook = {
      Events: {
        USER_CREATE: 'userCreate',
        USER_UPDATE: 'userUpdate',
        USER_DELETE: 'userDelete',
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

    if (typeof originalUser === 'undefined') {
      delete global.User;
    } else {
      global.User = originalUser;
    }

    if (typeof originalProject === 'undefined') {
      delete global.Project;
    } else {
      global.Project = originalProject;
    }

    if (typeof originalProjectManager === 'undefined') {
      delete global.ProjectManager;
    } else {
      global.ProjectManager = originalProjectManager;
    }

    if (typeof originalBoardMembership === 'undefined') {
      delete global.BoardMembership;
    } else {
      global.BoardMembership = originalBoardMembership;
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

    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });

  test('creates user, normalizes fields, and sends webhooks', async () => {
    User.qm.createOne.mockResolvedValue({ id: 'user-1' });

    const result = await createUser.fn({
      values: {
        email: 'User@Email.com',
        username: 'NewUser',
        password: 'secret',
      },
      actorUser: { id: 'admin-1' },
      request: { id: 'req-1' },
    });

    expect(result).toEqual({ id: 'user-1' });
    expect(User.qm.createOne).toHaveBeenCalledWith({
      email: 'user@email.com',
      username: 'newuser',
      password: 'hashed:secret',
    });
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(3);
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });

  test('updates user personal fields and sends webhooks', async () => {
    User.qm.updateOne.mockResolvedValue({ id: 'user-2', avatar: null });

    const result = await updateUser.fn({
      record: { id: 'user-2', avatar: { dirname: 'old' } },
      values: { email: 'NEW@EMAIL.COM' },
      actorUser: { id: 'admin-1' },
      request: { id: 'req-2' },
    });

    expect(result).toEqual({ id: 'user-2', avatar: null });
    expect(User.qm.updateOne).toHaveBeenCalledWith('user-2', {
      email: 'new@email.com',
    });
    expect(sails.helpers.users.removeRelatedFiles).toHaveBeenCalledWith({
      id: 'user-2',
      avatar: { dirname: 'old' },
    });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });

  test('updates user password and removes sessions', async () => {
    User.qm.updateOne.mockResolvedValue({ id: 'user-3' });

    const result = await updateUser.fn({
      record: { id: 'user-3' },
      values: { password: 'secret' },
      actorUser: { id: 'admin-1' },
    });

    expect(result).toEqual({ id: 'user-3' });
    expect(sails.sockets.leaveAll).toHaveBeenCalledWith('@user:user-3');
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });

  test('updates user with public fields and broadcasts to scoper', async () => {
    User.qm.updateOne.mockResolvedValue({ id: 'user-4', role: 'member' });

    const result = await updateUser.fn({
      record: { id: 'user-4', role: 'member' },
      values: { username: 'NewName' },
      actorUser: { id: 'admin-1' },
      request: { id: 'req-3' },
    });

    expect(result).toEqual({ id: 'user-4', role: 'member' });
    expect(sails.helpers.users.makeScoper).toHaveBeenCalled();
    expect(sails.sockets.broadcast).toHaveBeenCalled();
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });

  test('deletes user and creates project managers for lonely projects', async () => {
    sails.helpers.users.deleteRelated.mockResolvedValue({
      projectManagers: [{ projectId: 'project-1' }],
      boardMemberships: [{ id: 'bm-1' }],
    });
    User.qm.deleteOne.mockResolvedValue({ id: 'user-5' });

    const result = await deleteUser.fn({
      record: { id: 'user-5' },
      actorUser: { id: 'admin-1' },
      request: { id: 'req-4' },
    });

    expect(result).toEqual({ id: 'user-5' });
    expect(sails.helpers.users.removeRelatedFiles).toHaveBeenCalledWith({
      id: 'user-5',
    });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
    expect(sails.helpers.projectManagers.createOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: {
          project: { id: 'project-1' },
          user: { id: 'admin-1' },
        },
      }),
    );
  });

  test('make-scoper resolves private and public user ids', async () => {
    User.qm.getAll.mockResolvedValue([
      { id: 'admin-1', role: 'admin' },
      { id: 'owner-1', role: 'projectOwner' },
    ]);

    const scoper = makeScoper.fn({ record: { id: 'user-1' } });

    const privateUserIds = await scoper.getPrivateUserRelatedUserIds();
    const publicUserIds = await scoper.getPublicUserRelatedUserIds();

    expect(privateUserIds).toEqual(expect.arrayContaining(['user-1', 'admin-1']));
    expect(publicUserIds).toEqual(
      expect.arrayContaining(['owner-1', 'pm-2', 'member-1', 'member-2']),
    );
  });
});
