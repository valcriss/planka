const lodash = require('lodash');
const createProject = require('../api/helpers/projects/create-one');
const updateProject = require('../api/helpers/projects/update-one');
const deleteProject = require('../api/helpers/projects/delete-one');
const makeScoper = require('../api/helpers/projects/make-scoper');

const originalSails = global.sails;
const originalProject = global.Project;
const originalWebhook = global.Webhook;
const originalProjectFavorite = global.ProjectFavorite;
const originalProjectManager = global.ProjectManager;
const originalBoardMembership = global.BoardMembership;
const originalUser = global.User;
const originalLodash = global._;
describe('helpers/projects lifecycle', () => {
  beforeEach(() => {
    global._ = lodash;
    const scoper = {
      getProjectRelatedUserIds: jest.fn().mockResolvedValue(['user-1']),
      getUserIdsWithFullProjectVisibility: jest.fn().mockResolvedValue(['user-1']),
      projectManagerUserIds: null,
      cloneForProject: jest.fn().mockReturnThis(),
      getAdminUserIds: jest.fn().mockResolvedValue(['admin-1']),
      getProjectManagerUserIds: jest.fn().mockResolvedValue(['user-1']),
      getBoardMembershipsForWholeProject: jest.fn().mockResolvedValue([]),
    };
    global.sails = {
      helpers: {
        projects: {
          makeScoper: {
            with: jest.fn().mockReturnValue(scoper),
          },
          getBoardsTotalById: jest.fn().mockResolvedValue(0),
          deleteRelated: jest.fn().mockResolvedValue({ projectManagers: [] }),
          getProjectManagersTotalById: jest.fn().mockResolvedValue(0),
          getBoardIdsById: jest.fn().mockResolvedValue(['board-1']),
          getManagerUserIds: jest.fn().mockResolvedValue(['user-1']),
        },
        users: {
          getAllIds: jest.fn().mockResolvedValue(['admin-1']),
          isProjectFavorite: jest.fn().mockResolvedValue(false),
        },
        utils: {
          mapRecords: jest.fn().mockReturnValue(['user-1']),
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
    global.Project = {
      BackgroundTypes: {
        GRADIENT: 'gradient',
        IMAGE: 'image',
      },
      qm: {
        createOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
    global.ProjectManager = {
      qm: {
        getByProjectId: jest.fn().mockResolvedValue([]),
      },
    };
    global.ProjectFavorite = {
      qm: {
        createOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
    global.BoardMembership = {
      qm: {
        getByProjectId: jest.fn().mockResolvedValue([]),
        getByBoardId: jest.fn().mockResolvedValue([]),
      },
    };
    global.User = {
      Roles: {
        ADMIN: 'admin',
      },
    };
    global.Webhook = {
      Events: {
        PROJECT_CREATE: 'projectCreate',
        PROJECT_UPDATE: 'projectUpdate',
        PROJECT_DELETE: 'projectDelete',
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
    if (typeof originalProject === 'undefined') {
      delete global.Project;
    } else {
      global.Project = originalProject;
    }
    if (typeof originalWebhook === 'undefined') {
      delete global.Webhook;
    } else {
      global.Webhook = originalWebhook;
    }
    if (typeof originalProjectFavorite === 'undefined') {
      delete global.ProjectFavorite;
    } else {
      global.ProjectFavorite = originalProjectFavorite;
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
    if (typeof originalUser === 'undefined') {
      delete global.User;
    } else {
      global.User = originalUser;
    }
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('creates project and sends webhooks', async () => {
    const scoper = {
      getUserIdsWithFullProjectVisibility: jest.fn().mockResolvedValue(['user-1']),
      projectManagerUserIds: null,
    };
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);
    Project.qm.createOne.mockResolvedValue({
      project: { id: 'project-1' },
      projectManager: { userId: 'user-1' },
    });
    const result = await createProject.fn({
      values: { name: 'Project' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });
    expect(result.project).toEqual({ id: 'project-1' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('updates project favorite flag without other changes', async () => {
    const result = await updateProject.fn({
      record: { id: 'project-2' },
      values: { isFavorite: true },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-2' },
    });
    expect(result).toEqual({ id: 'project-2' });
    expect(ProjectFavorite.qm.createOne).toHaveBeenCalledWith({
      projectId: 'project-2',
      userId: 'actor-1',
    });
  });
  test('deletes project when no boards exist', async () => {
    Project.qm.deleteOne.mockResolvedValue({ id: 'project-3' });
    const result = await deleteProject.fn({
      record: { id: 'project-3' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-3' },
    });
    expect(result).toEqual({ id: 'project-3' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('throws when project still has boards', async () => {
    sails.helpers.projects.getBoardsTotalById.mockResolvedValue(1);
    await expect(
      deleteProject.fn({
        record: { id: 'project-4' },
        actorUser: { id: 'actor-1' },
      }),
    ).rejects.toBe('mustNotHaveBoards');
  });
  test('make-scoper requires board when notification service is set', () => {
    expect(() =>
      makeScoper.fn({
        record: { id: 'project-1' },
        notificationService: { id: 'ns-1' },
      }),
    ).toThrow('boardMustBePresent');
  });
  test('make-scoper returns related user ids', async () => {
    const scoper = makeScoper.fn({ record: { id: 'project-1' } });
    const result = await scoper.getProjectRelatedUserIds();
    expect(result).toEqual(['admin-1', 'user-1']);
  });
});
