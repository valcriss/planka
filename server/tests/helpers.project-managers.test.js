const lodash = require('lodash');
const createProjectManager = require('../api/helpers/project-managers/create-one');
const deleteProjectManager = require('../api/helpers/project-managers/delete-one');
const getPathToProjectById = require('../api/helpers/project-managers/get-path-to-project-by-id');

const originalSails = global.sails;
const originalProjectManager = global.ProjectManager;
const originalProject = global.Project;
const originalUser = global.User;
const originalWebhook = global.Webhook;
const originalLodash = global._;
describe('helpers/project-managers', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      helpers: {
        projects: {
          makeScoper: {
            with: jest.fn(),
          },
          getProjectManagersTotalById: jest.fn(),
          getBoardIdsById: jest.fn(),
        },
        users: {
          isAdminOrProjectOwner: jest.fn(),
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
        removeRoomMembersFromRooms: jest.fn(),
      },
    };
    global.ProjectManager = {
      qm: {
        createOne: jest.fn(),
        deleteOne: jest.fn(),
        getOneById: jest.fn(),
      },
    };
    global.Project = {
      qm: {
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
        PROJECT_MANAGER_CREATE: 'projectManagerCreate',
        PROJECT_MANAGER_DELETE: 'projectManagerDelete',
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
    if (typeof originalProjectManager === 'undefined') {
      delete global.ProjectManager;
    } else {
      global.ProjectManager = originalProjectManager;
    }
    if (typeof originalProject === 'undefined') {
      delete global.Project;
    } else {
      global.Project = originalProject;
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
  test('throws when project is not private', async () => {
    await expect(
      createProjectManager.fn({
        values: {
          project: { id: 'project-1', ownerProjectManagerId: 'pm-1' },
          user: { id: 'user-1' },
        },
        actorUser: { id: 'actor-1' },
      }),
    ).rejects.toBe('projectInValuesMustBePrivate');
  });
  test('throws when user is not admin or owner', async () => {
    sails.helpers.users.isAdminOrProjectOwner.mockReturnValue(false);
    await expect(
      createProjectManager.fn({
        values: {
          project: { id: 'project-1', ownerProjectManagerId: null },
          user: { id: 'user-1' },
        },
        actorUser: { id: 'actor-1' },
      }),
    ).rejects.toBe('userInValuesMustBeAdminOrProjectOwner');
  });
  test('throws when user already project manager', async () => {
    sails.helpers.users.isAdminOrProjectOwner.mockReturnValue(true);
    ProjectManager.qm.createOne.mockRejectedValue({ code: 'E_UNIQUE' });
    await expect(
      createProjectManager.fn({
        values: {
          project: { id: 'project-1', ownerProjectManagerId: null },
          user: { id: 'user-1' },
        },
        actorUser: { id: 'actor-1' },
      }),
    ).rejects.toBe('userAlreadyProjectManager');
  });
  test('creates project manager and sends webhooks', async () => {
    sails.helpers.users.isAdminOrProjectOwner.mockReturnValue(true);
    ProjectManager.qm.createOne.mockResolvedValue({
      id: 'pm-1',
      projectId: 'project-1',
    });
    const scoper = {
      getProjectRelatedUserIds: jest.fn().mockResolvedValue(['user-1', 'user-2']),
    };
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);
    const result = await createProjectManager.fn({
      values: {
        project: { id: 'project-1', ownerProjectManagerId: null },
        user: { id: 'user-1' },
      },
      actorUser: { id: 'actor-1' },
      webhooks: [{ id: 'wh-1' }],
      request: { id: 'req-1' },
    });
    expect(result).toEqual({ id: 'pm-1', projectId: 'project-1' });
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalledWith(
      expect.objectContaining({
        event: Webhook.Events.PROJECT_MANAGER_CREATE,
      }),
    );
  });
  test('throws when trying to delete the last project manager', async () => {
    sails.helpers.projects.getProjectManagersTotalById.mockResolvedValue(0);
    await expect(
      deleteProjectManager.fn({
        record: { id: 'pm-2', projectId: 'project-2' },
        user: { id: 'user-2', role: 'member' },
        project: { id: 'project-2', ownerProjectManagerId: null },
        actorUser: { id: 'actor-2' },
      }),
    ).rejects.toBe('mustNotBeLast');
  });
  test('deletes project manager and updates board access', async () => {
    sails.helpers.projects.getProjectManagersTotalById.mockResolvedValue(1);
    sails.helpers.projects.getBoardIdsById.mockResolvedValue(['board-1', 'board-2']);
    const scoper = {
      getProjectManagerUserIds: jest.fn().mockResolvedValue(['user-3']),
      getBoardMembershipsForWholeProject: jest
        .fn()
        .mockResolvedValue([{ userId: 'user-3', boardId: 'board-1' }]),
      getProjectRelatedUserIds: jest.fn().mockResolvedValue(['user-3', 'user-4']),
    };
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);
    ProjectManager.qm.deleteOne.mockResolvedValue({
      id: 'pm-3',
      projectId: 'project-3',
      userId: 'user-3',
    });
    const result = await deleteProjectManager.fn({
      record: { id: 'pm-3', projectId: 'project-3' },
      user: { id: 'user-3', role: 'member' },
      project: { id: 'project-3', ownerProjectManagerId: null },
      actorUser: { id: 'actor-3' },
      request: { id: 'req-3' },
    });
    expect(result).toEqual({
      id: 'pm-3',
      projectId: 'project-3',
      userId: 'user-3',
    });
    expect(sails.sockets.removeRoomMembersFromRooms).toHaveBeenCalledWith(
      '@user:user-3',
      'board:board-2',
    );
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalledWith(
      expect.objectContaining({
        event: Webhook.Events.PROJECT_MANAGER_DELETE,
      }),
    );
  });
  test('returns null when delete fails', async () => {
    sails.helpers.projects.getProjectManagersTotalById.mockResolvedValue(1);
    const scoper = {
      getProjectManagerUserIds: jest.fn().mockResolvedValue(['user-4']),
      getBoardMembershipsForWholeProject: jest.fn().mockResolvedValue([]),
      getProjectRelatedUserIds: jest.fn().mockResolvedValue(['user-4']),
    };
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);
    ProjectManager.qm.deleteOne.mockResolvedValue(null);
    const result = await deleteProjectManager.fn({
      record: { id: 'pm-4', projectId: 'project-4' },
      user: { id: 'user-4', role: 'member' },
      project: { id: 'project-4', ownerProjectManagerId: null },
      actorUser: { id: 'actor-4' },
    });
    expect(result).toBeNull();
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });
  test('returns path for project manager', async () => {
    ProjectManager.qm.getOneById.mockResolvedValue({
      id: 'pm-5',
      projectId: 'project-5',
    });
    Project.qm.getOneById.mockResolvedValue({ id: 'project-5' });
    const result = await getPathToProjectById.fn({ id: 'pm-5' });
    expect(result).toEqual({
      projectManager: { id: 'pm-5', projectId: 'project-5' },
      project: { id: 'project-5' },
    });
  });
  test('throws pathNotFound when project manager missing', async () => {
    ProjectManager.qm.getOneById.mockResolvedValue(null);
    await expect(getPathToProjectById.fn({ id: 'pm-6' })).rejects.toBe('pathNotFound');
  });
  test('throws pathNotFound when project missing', async () => {
    ProjectManager.qm.getOneById.mockResolvedValue({
      id: 'pm-7',
      projectId: 'project-7',
    });
    Project.qm.getOneById.mockResolvedValue(null);
    await expect(getPathToProjectById.fn({ id: 'pm-7' })).rejects.toEqual({
      pathNotFound: {
        projectManager: { id: 'pm-7', projectId: 'project-7' },
      },
    });
  });
});
