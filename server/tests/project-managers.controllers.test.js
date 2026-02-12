const originalUser = global.User;
const originalProject = global.Project;
const originalSails = global.sails;

global.User = {
  Roles: {
    ADMIN: 'admin',
  },
  qm: {
    getOneById: jest.fn(),
  },
};

global.Project = {
  qm: {
    getOneById: jest.fn(),
  },
};

const createController = require('../api/controllers/project-managers/create');
const deleteController = require('../api/controllers/project-managers/delete');

const makeInterceptable = (value, codeToThrow) => ({
  intercept(code, handler) {
    if (code === codeToThrow) {
      throw handler();
    }

    return value;
  },
});

const makeChainable = (value, codeToThrow) => {
  const chain = {
    ...value,
    intercept(code, handler) {
      if (code === codeToThrow) {
        throw handler();
      }

      return chain;
    },
  };

  return chain;
};

describe('project-managers controllers', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        users: {
          isProjectManager: jest.fn(),
        },
        projectManagers: {
          getPathToProjectById: jest.fn(),
          createOne: {
            with: jest.fn(),
          },
          deleteOne: {
            with: jest.fn(),
          },
        },
      },
    };

    Project.qm.getOneById.mockReset();
    User.qm.getOneById.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.User = originalUser;
    global.Project = originalProject;
    global.sails = originalSails;
  });

  test('create handles project/user errors and rights', async () => {
    const req = { currentUser: { id: 'u1', role: 'member' } };

    Project.qm.getOneById.mockResolvedValueOnce(null);
    await expect(
      createController.fn.call({ req }, { projectId: 'p1', userId: 'u2' }),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1', ownerProjectManagerId: null });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(
      createController.fn.call({ req }, { projectId: 'p1', userId: 'u2' }),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1', ownerProjectManagerId: 'pm1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    await expect(
      createController.fn.call({ req }, { projectId: 'p1', userId: 'u2' }),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1', ownerProjectManagerId: null });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    User.qm.getOneById.mockResolvedValueOnce(null);
    await expect(
      createController.fn.call({ req }, { projectId: 'p1', userId: 'u2' }),
    ).rejects.toEqual({
      userNotFound: 'User not found',
    });
  });

  test('create intercepts helper errors and succeeds', async () => {
    const req = { currentUser: { id: 'u1', role: 'admin' } };
    const project = { id: 'p1', ownerProjectManagerId: null };
    const user = { id: 'u2' };

    Project.qm.getOneById.mockResolvedValue(project);
    User.qm.getOneById.mockResolvedValue(user);
    sails.helpers.projectManagers.createOne.with.mockReturnValueOnce(
      makeChainable({ id: 'pm1' }, 'userAlreadyProjectManager'),
    );
    await expect(
      createController.fn.call({ req }, { projectId: 'p1', userId: 'u2' }),
    ).rejects.toEqual({
      userAlreadyProjectManager: 'User already project manager',
    });

    sails.helpers.projectManagers.createOne.with.mockReturnValueOnce(
      makeChainable({ id: 'pm1' }, 'userInValuesMustBeAdminOrProjectOwner'),
    );
    await expect(
      createController.fn.call({ req }, { projectId: 'p1', userId: 'u2' }),
    ).rejects.toEqual({
      userMustBeAdminOrProjectOwner: 'User must be admin or project owner',
    });

    const created = { id: 'pm2' };
    sails.helpers.projectManagers.createOne.with.mockReturnValueOnce(makeChainable(created));
    const result = await createController.fn.call({ req }, { projectId: 'p1', userId: 'u2' });

    expect(result).toEqual({ item: expect.objectContaining({ id: 'pm2' }) });
  });

  test('delete handles path, rights and helper failures', async () => {
    const req = { currentUser: { id: 'u1', role: 'member' } };

    sails.helpers.projectManagers.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(deleteController.fn.call({ req }, { id: 'pm1' })).rejects.toEqual({
      projectManagerNotFound: 'Project manager not found',
    });

    sails.helpers.projectManagers.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        projectManager: { id: 'pm1', userId: 'u2' },
        project: { id: 'p1', ownerProjectManagerId: null },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(deleteController.fn.call({ req }, { id: 'pm1' })).rejects.toEqual({
      projectManagerNotFound: 'Project manager not found',
    });

    sails.helpers.projectManagers.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        projectManager: { id: 'pm1', userId: 'u2' },
        project: { id: 'p1', ownerProjectManagerId: 'pm-owner' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    await expect(deleteController.fn.call({ req }, { id: 'pm1' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.projectManagers.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        projectManager: { id: 'pm1', userId: 'u2' },
        project: { id: 'p1', ownerProjectManagerId: null },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    User.qm.getOneById.mockResolvedValueOnce({ id: 'u2' });
    sails.helpers.projectManagers.deleteOne.with.mockReturnValueOnce(
      makeInterceptable({}, 'mustNotBeLast'),
    );
    await expect(deleteController.fn.call({ req }, { id: 'pm1' })).rejects.toEqual({
      mustNotBeLast: 'Must not be last',
    });

    sails.helpers.projectManagers.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        projectManager: { id: 'pm1', userId: 'u2' },
        project: { id: 'p1', ownerProjectManagerId: null },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    User.qm.getOneById.mockResolvedValueOnce({ id: 'u2' });
    sails.helpers.projectManagers.deleteOne.with.mockReturnValueOnce(makeInterceptable(null));
    await expect(deleteController.fn.call({ req }, { id: 'pm1' })).rejects.toEqual({
      projectManagerNotFound: 'Project manager not found',
    });
  });

  test('delete succeeds for admin user', async () => {
    const req = { currentUser: { id: 'u1', role: 'admin' } };

    sails.helpers.projectManagers.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        projectManager: { id: 'pm1', userId: 'u2' },
        project: { id: 'p1', ownerProjectManagerId: null },
      }),
    );
    User.qm.getOneById.mockResolvedValueOnce({ id: 'u2' });
    sails.helpers.projectManagers.deleteOne.with.mockReturnValueOnce(
      makeInterceptable({ id: 'pm1' }),
    );

    const result = await deleteController.fn.call({ req }, { id: 'pm1' });
    expect(result).toEqual({ item: { id: 'pm1' } });
  });
});
