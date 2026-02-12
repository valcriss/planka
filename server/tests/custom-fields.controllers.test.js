const createInGroupController = require('../api/controllers/custom-fields/create-in-custom-field-group');
const createInBaseGroupController = require('../api/controllers/custom-fields/create-in-base-custom-field-group');
const updateController = require('../api/controllers/custom-fields/update');
const deleteController = require('../api/controllers/custom-fields/delete');

const originalSails = global.sails;
const originalBoardMembership = global.BoardMembership;
const originalLodash = global._;

const makeInterceptable = (value, codeToThrow) => ({
  intercept(code, handler) {
    if (code === codeToThrow) {
      throw handler();
    }

    return value;
  },
});

describe('custom-fields controllers', () => {
  beforeEach(() => {
    global._ = require('lodash'); // eslint-disable-line global-require

    global.sails = {
      helpers: {
        baseCustomFieldGroups: {
          getPathToProjectById: jest.fn(),
        },
        customFieldGroups: {
          getPathToProjectById: jest.fn(),
        },
        customFields: {
          getPathToProjectById: jest.fn(),
          createOneInBaseCustomFieldGroup: {
            with: jest.fn(),
          },
          createOneInCustomFieldGroup: {
            with: jest.fn(),
          },
          updateOneInBaseCustomFieldGroup: {
            with: jest.fn(),
          },
          updateOneInCustomFieldGroup: {
            with: jest.fn(),
          },
          deleteOneInBaseCustomFieldGroup: {
            with: jest.fn(),
          },
          deleteOneInCustomFieldGroup: {
            with: jest.fn(),
          },
        },
        users: {
          isProjectManager: jest.fn(),
        },
      },
    };

    global.BoardMembership = {
      Roles: {
        EDITOR: 'editor',
      },
      qm: {
        getOneByBoardIdAndUserId: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.BoardMembership = originalBoardMembership;
    global._ = originalLodash;
  });

  test('create-in-custom-field-group handles path and rights checks', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(
      createInGroupController.fn.call(
        { req },
        { customFieldGroupId: 'cfg1', position: 0, name: 'Field A' },
      ),
    ).rejects.toEqual({
      customFieldGroupNotFound: 'Custom field group not found',
    });

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        customFieldGroup: { id: 'cfg1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(
      createInGroupController.fn.call(
        { req },
        { customFieldGroupId: 'cfg1', position: 0, name: 'Field A' },
      ),
    ).rejects.toEqual({
      customFieldGroupNotFound: 'Custom field group not found',
    });

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        customFieldGroup: { id: 'cfg1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(
      createInGroupController.fn.call(
        { req },
        { customFieldGroupId: 'cfg1', position: 0, name: 'Field A' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('create-in-custom-field-group creates custom field', async () => {
    const req = { currentUser: { id: 'u1' } };
    const created = { id: 'cf1' };

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValue(
      makeInterceptable({
        customFieldGroup: { id: 'cfg1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({ role: 'editor' });
    sails.helpers.customFields.createOneInCustomFieldGroup.with.mockResolvedValue(created);

    const result = await createInGroupController.fn.call(
      { req },
      { customFieldGroupId: 'cfg1', position: 0, name: 'Field A', showOnFrontOfCard: true },
    );
    expect(result).toEqual({ item: created });
  });

  test('create-in-base-custom-field-group handles path and manager checks', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.baseCustomFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(
      createInBaseGroupController.fn.call(
        { req },
        { baseCustomFieldGroupId: 'bcfg1', position: 0, name: 'Field B' },
      ),
    ).rejects.toEqual({
      baseCustomFieldGroupNotFound: 'Base custom field group not found',
    });

    sails.helpers.baseCustomFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        baseCustomFieldGroup: { id: 'bcfg1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(
      createInBaseGroupController.fn.call(
        { req },
        { baseCustomFieldGroupId: 'bcfg1', position: 0, name: 'Field B' },
      ),
    ).rejects.toEqual({
      baseCustomFieldGroupNotFound: 'Base custom field group not found',
    });

    sails.helpers.baseCustomFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        baseCustomFieldGroup: { id: 'bcfg1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    sails.helpers.customFields.createOneInBaseCustomFieldGroup.with.mockResolvedValueOnce({
      id: 'cf-base',
    });

    const result = await createInBaseGroupController.fn.call(
      { req },
      { baseCustomFieldGroupId: 'bcfg1', position: 0, name: 'Field B' },
    );

    expect(result).toEqual({ item: { id: 'cf-base' } });
  });

  test('custom-fields/update handles base and group scoped branches', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.customFields.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(updateController.fn.call({ req }, { id: 'cf1' })).rejects.toEqual({
      customFieldNotFound: 'Custom field not found',
    });

    sails.helpers.customFields.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        customField: { id: 'cf-base', baseCustomFieldGroupId: 'bcfg1' },
        baseCustomFieldGroup: { id: 'bcfg1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(updateController.fn.call({ req }, { id: 'cf-base', name: 'X' })).rejects.toEqual({
      customFieldNotFound: 'Custom field not found',
    });

    sails.helpers.customFields.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        customField: { id: 'cf-group', customFieldGroupId: 'cfg1' },
        customFieldGroup: { id: 'cfg1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(updateController.fn.call({ req }, { id: 'cf-group', name: 'Y' })).rejects.toEqual({
      customFieldNotFound: 'Custom field not found',
    });

    sails.helpers.customFields.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        customField: { id: 'cf-group', customFieldGroupId: 'cfg1' },
        customFieldGroup: { id: 'cfg1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(updateController.fn.call({ req }, { id: 'cf-group', name: 'Y' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.customFields.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        customField: { id: 'cf-group', customFieldGroupId: 'cfg1' },
        customFieldGroup: { id: 'cfg1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.customFields.updateOneInCustomFieldGroup.with.mockResolvedValueOnce(null);
    await expect(updateController.fn.call({ req }, { id: 'cf-group', name: 'Y' })).rejects.toEqual({
      customFieldNotFound: 'Custom field not found',
    });
  });

  test('custom-fields/update succeeds for base and group scoped records', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.customFields.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        customField: { id: 'cf-base', baseCustomFieldGroupId: 'bcfg1' },
        baseCustomFieldGroup: { id: 'bcfg1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    sails.helpers.customFields.updateOneInBaseCustomFieldGroup.with.mockResolvedValueOnce({
      id: 'cf-base',
    });
    const baseResult = await updateController.fn.call({ req }, { id: 'cf-base', name: 'X' });
    expect(baseResult).toEqual({ item: { id: 'cf-base' } });

    sails.helpers.customFields.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        customField: { id: 'cf-group', customFieldGroupId: 'cfg1' },
        customFieldGroup: { id: 'cfg1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.customFields.updateOneInCustomFieldGroup.with.mockResolvedValueOnce({
      id: 'cf-group',
    });
    const groupResult = await updateController.fn.call({ req }, { id: 'cf-group', name: 'Y' });
    expect(groupResult).toEqual({ item: { id: 'cf-group' } });
  });

  test('custom-fields/delete handles and succeeds across branches', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.customFields.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(deleteController.fn.call({ req }, { id: 'cf1' })).rejects.toEqual({
      customFieldNotFound: 'Custom field not found',
    });

    sails.helpers.customFields.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        customField: { id: 'cf-base', baseCustomFieldGroupId: 'bcfg1' },
        baseCustomFieldGroup: { id: 'bcfg1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(deleteController.fn.call({ req }, { id: 'cf-base' })).rejects.toEqual({
      customFieldNotFound: 'Custom field not found',
    });

    sails.helpers.customFields.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        customField: { id: 'cf-group', customFieldGroupId: 'cfg1' },
        customFieldGroup: { id: 'cfg1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(deleteController.fn.call({ req }, { id: 'cf-group' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.customFields.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        customField: { id: 'cf-group', customFieldGroupId: 'cfg1' },
        customFieldGroup: { id: 'cfg1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.customFields.deleteOneInCustomFieldGroup.with.mockResolvedValueOnce(null);
    await expect(deleteController.fn.call({ req }, { id: 'cf-group' })).rejects.toEqual({
      customFieldNotFound: 'Custom field not found',
    });

    sails.helpers.customFields.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        customField: { id: 'cf-base', baseCustomFieldGroupId: 'bcfg1' },
        baseCustomFieldGroup: { id: 'bcfg1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    sails.helpers.customFields.deleteOneInBaseCustomFieldGroup.with.mockResolvedValueOnce({
      id: 'cf-base',
    });
    const baseDeleteResult = await deleteController.fn.call({ req }, { id: 'cf-base' });
    expect(baseDeleteResult).toEqual({ item: { id: 'cf-base' } });

    sails.helpers.customFields.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        customField: { id: 'cf-group', customFieldGroupId: 'cfg1' },
        customFieldGroup: { id: 'cfg1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.customFields.deleteOneInCustomFieldGroup.with.mockResolvedValueOnce({
      id: 'cf-group',
    });

    const groupDeleteResult = await deleteController.fn.call({ req }, { id: 'cf-group' });
    expect(groupDeleteResult).toEqual({ item: { id: 'cf-group' } });
  });
});
