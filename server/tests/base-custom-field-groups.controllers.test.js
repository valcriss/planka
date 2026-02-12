const _ = require('lodash');

const baseCustomFieldGroupsCreateController = require('../api/controllers/base-custom-field-groups/create');
const baseCustomFieldGroupsDeleteController = require('../api/controllers/base-custom-field-groups/delete');
const baseCustomFieldGroupsUpdateController = require('../api/controllers/base-custom-field-groups/update');

const originalSails = global.sails;
const originalProject = global.Project;
const originalLodash = global._;

const makeInterceptable = (promise) => ({
  intercept: (code, handler) =>
    makeInterceptable(
      promise.catch((error) => {
        if (error === code || (error && error.code === code)) {
          throw handler();
        }
        throw error;
      }),
    ),
  then: (...args) => promise.then(...args),
  catch: (...args) => promise.catch(...args),
  finally: (...args) => promise.finally(...args),
});

const buildError = (code) => {
  const error = new Error(code);
  error.code = code;
  return error;
};

describe('base-custom-field-groups controllers', () => {
  beforeEach(() => {
    global._ = _;

    global.sails = {
      helpers: {
        users: {
          isProjectManager: jest.fn(),
        },
        baseCustomFieldGroups: {
          createOne: { with: jest.fn() },
          getPathToProjectById: jest.fn(),
          deleteOne: { with: jest.fn() },
          updateOne: { with: jest.fn() },
        },
      },
    };

    global.Project = {
      qm: {
        getOneById: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.Project = originalProject;
    global._ = originalLodash;
  });

  test('base-custom-field-groups/create throws when project is missing', async () => {
    Project.qm.getOneById.mockResolvedValue(null);

    await expect(
      baseCustomFieldGroupsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { projectId: 'p1', name: 'Group' },
      ),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });
  });

  test('base-custom-field-groups/create throws when user lacks access', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      baseCustomFieldGroupsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { projectId: 'p1', name: 'Group' },
      ),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });
  });

  test('base-custom-field-groups/create returns created item', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.baseCustomFieldGroups.createOne.with.mockResolvedValue({ id: 'bcfg1' });

    const result = await baseCustomFieldGroupsCreateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { projectId: 'p1', name: 'Group' },
    );

    expect(sails.helpers.baseCustomFieldGroups.createOne.with).toHaveBeenCalledWith({
      values: {
        name: 'Group',
        project: { id: 'p1' },
      },
      actorUser: { id: 'u1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'bcfg1' } });
  });

  test('base-custom-field-groups/delete throws for missing path', async () => {
    sails.helpers.baseCustomFieldGroups.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      baseCustomFieldGroupsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bcfg1' },
      ),
    ).rejects.toEqual({
      baseCustomFieldGroupNotFound: 'Base custom field group not found',
    });
  });

  test('base-custom-field-groups/delete throws when user lacks access', async () => {
    sails.helpers.baseCustomFieldGroups.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          baseCustomFieldGroup: { id: 'bcfg1' },
          project: { id: 'p1' },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      baseCustomFieldGroupsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bcfg1' },
      ),
    ).rejects.toEqual({
      baseCustomFieldGroupNotFound: 'Base custom field group not found',
    });
  });

  test('base-custom-field-groups/delete throws when deleteOne returns null', async () => {
    sails.helpers.baseCustomFieldGroups.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          baseCustomFieldGroup: { id: 'bcfg1' },
          project: { id: 'p1' },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.baseCustomFieldGroups.deleteOne.with.mockResolvedValue(null);

    await expect(
      baseCustomFieldGroupsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bcfg1' },
      ),
    ).rejects.toEqual({
      baseCustomFieldGroupNotFound: 'Base custom field group not found',
    });
  });

  test('base-custom-field-groups/delete returns deleted item', async () => {
    sails.helpers.baseCustomFieldGroups.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          baseCustomFieldGroup: { id: 'bcfg1' },
          project: { id: 'p1' },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.baseCustomFieldGroups.deleteOne.with.mockResolvedValue({ id: 'bcfg1' });

    const result = await baseCustomFieldGroupsDeleteController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'bcfg1' },
    );

    expect(result).toEqual({ item: { id: 'bcfg1' } });
  });

  test('base-custom-field-groups/update throws for missing path', async () => {
    sails.helpers.baseCustomFieldGroups.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      baseCustomFieldGroupsUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bcfg1', name: 'Next' },
      ),
    ).rejects.toEqual({
      baseCustomFieldGroupNotFound: 'Base custom field group not found',
    });
  });

  test('base-custom-field-groups/update throws when user lacks access', async () => {
    sails.helpers.baseCustomFieldGroups.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          baseCustomFieldGroup: { id: 'bcfg1' },
          project: { id: 'p1' },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      baseCustomFieldGroupsUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bcfg1', name: 'Next' },
      ),
    ).rejects.toEqual({
      baseCustomFieldGroupNotFound: 'Base custom field group not found',
    });
  });

  test('base-custom-field-groups/update throws when updateOne returns null', async () => {
    sails.helpers.baseCustomFieldGroups.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          baseCustomFieldGroup: { id: 'bcfg1' },
          project: { id: 'p1' },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.baseCustomFieldGroups.updateOne.with.mockResolvedValue(null);

    await expect(
      baseCustomFieldGroupsUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bcfg1', name: 'Next' },
      ),
    ).rejects.toEqual({
      baseCustomFieldGroupNotFound: 'Base custom field group not found',
    });
  });

  test('base-custom-field-groups/update returns updated item', async () => {
    sails.helpers.baseCustomFieldGroups.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          baseCustomFieldGroup: { id: 'bcfg1' },
          project: { id: 'p1' },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.baseCustomFieldGroups.updateOne.with.mockResolvedValue({ id: 'bcfg1' });

    const result = await baseCustomFieldGroupsUpdateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'bcfg1', name: 'Next' },
    );

    expect(result).toEqual({ item: { id: 'bcfg1' } });
  });
});
