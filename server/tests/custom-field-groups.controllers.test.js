const createInBoardController = require('../api/controllers/custom-field-groups/create-in-board');
const createInCardController = require('../api/controllers/custom-field-groups/create-in-card');
const showController = require('../api/controllers/custom-field-groups/show');
const updateController = require('../api/controllers/custom-field-groups/update');
const deleteController = require('../api/controllers/custom-field-groups/delete');

const originalSails = global.sails;
const originalBoardMembership = global.BoardMembership;
const originalBaseCustomFieldGroup = global.BaseCustomFieldGroup;
const originalUser = global.User;
const originalCustomField = global.CustomField;
const originalCustomFieldValue = global.CustomFieldValue;
const originalLodash = global._;

const makeInterceptable = (value, codeToThrow) => ({
  intercept(code, handler) {
    if (code === codeToThrow) {
      throw handler();
    }

    return value;
  },
});

describe('custom-field-groups controllers', () => {
  beforeEach(() => {
    global._ = require('lodash'); // eslint-disable-line global-require

    global.sails = {
      helpers: {
        boards: {
          getPathToProjectById: jest.fn(),
        },
        cards: {
          getPathToProjectById: jest.fn(),
        },
        customFieldGroups: {
          getPathToProjectById: jest.fn(),
          createOneInBoard: {
            with: jest.fn(),
          },
          createOneInCard: {
            with: jest.fn(),
          },
          updateOneInBoard: {
            with: jest.fn(),
          },
          updateOneInCard: {
            with: jest.fn(),
          },
          deleteOneInBoard: {
            with: jest.fn(),
          },
          deleteOneInCard: {
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

    global.BaseCustomFieldGroup = {
      qm: {
        getOneById: jest.fn(),
      },
    };

    global.User = {
      Roles: {
        ADMIN: 'admin',
      },
    };

    global.CustomField = {
      qm: {
        getByCustomFieldGroupId: jest.fn(),
      },
    };

    global.CustomFieldValue = {
      qm: {
        getByCustomFieldGroupId: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.BoardMembership = originalBoardMembership;
    global.BaseCustomFieldGroup = originalBaseCustomFieldGroup;
    global.User = originalUser;
    global.CustomField = originalCustomField;
    global.CustomFieldValue = originalCustomFieldValue;
    global._ = originalLodash;
  });

  test('create-in-board handles path, membership and base group checks', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.boards.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(
      createInBoardController.fn.call({ req }, { boardId: 'b1', position: 0 }),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });

    sails.helpers.boards.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({ board: { id: 'b1' }, project: { id: 'p1' } }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(
      createInBoardController.fn.call({ req }, { boardId: 'b1', position: 0 }),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });

    sails.helpers.boards.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({ board: { id: 'b1' }, project: { id: 'p1' } }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(
      createInBoardController.fn.call({ req }, { boardId: 'b1', position: 0 }),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.boards.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({ board: { id: 'b1' }, project: { id: 'p1' } }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    BaseCustomFieldGroup.qm.getOneById.mockResolvedValueOnce(null);
    await expect(
      createInBoardController.fn.call(
        { req },
        { boardId: 'b1', position: 0, baseCustomFieldGroupId: 'bcfg1' },
      ),
    ).rejects.toEqual({
      baseCustomFieldGroupNotFound: 'Base custom field group not found',
    });
  });

  test('create-in-board creates group and maps helper validation error', async () => {
    const req = { currentUser: { id: 'u1' } };
    const created = { id: 'cfg1' };

    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable({ board: { id: 'b1' }, project: { id: 'p1' } }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({ role: 'editor' });
    sails.helpers.customFieldGroups.createOneInBoard.with.mockReturnValueOnce(
      makeInterceptable({}, 'baseCustomFieldGroupOrNameMustBeInValues'),
    );
    await expect(
      createInBoardController.fn.call({ req }, { boardId: 'b1', position: 0 }),
    ).rejects.toEqual({
      baseCustomFieldGroupOrNameMustBePresent: 'Base custom field group or name must be present',
    });

    sails.helpers.customFieldGroups.createOneInBoard.with.mockReturnValueOnce(
      makeInterceptable(created),
    );
    const result = await createInBoardController.fn.call(
      { req },
      { boardId: 'b1', position: 1, name: 'Group A' },
    );
    expect(result).toEqual({ item: created });
  });

  test('create-in-card handles path, rights, base group, and validation errors', async () => {
    const req = { currentUser: { id: 'u1' } };
    const path = {
      card: { id: 'c1' },
      list: { id: 'l1' },
      board: { id: 'b1' },
      project: { id: 'p1' },
    };

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(
      createInCardController.fn.call({ req }, { cardId: 'c1', position: 0 }),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(
      createInCardController.fn.call({ req }, { cardId: 'c1', position: 0 }),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(
      createInCardController.fn.call({ req }, { cardId: 'c1', position: 0 }),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    BaseCustomFieldGroup.qm.getOneById.mockResolvedValueOnce(null);
    await expect(
      createInCardController.fn.call(
        { req },
        { cardId: 'c1', position: 0, baseCustomFieldGroupId: 'bcfg1' },
      ),
    ).rejects.toEqual({
      baseCustomFieldGroupNotFound: 'Base custom field group not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    BaseCustomFieldGroup.qm.getOneById.mockResolvedValueOnce({ id: 'bcfg1' });
    sails.helpers.customFieldGroups.createOneInCard.with.mockReturnValueOnce(
      makeInterceptable({}, 'baseCustomFieldGroupOrNameMustBeInValues'),
    );
    await expect(
      createInCardController.fn.call(
        { req },
        { cardId: 'c1', position: 0, baseCustomFieldGroupId: 'bcfg1' },
      ),
    ).rejects.toEqual({
      baseCustomFieldGroupOrNameMustBePresent: 'Base custom field group or name must be present',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.customFieldGroups.createOneInCard.with.mockReturnValueOnce(
      makeInterceptable({ id: 'cfg2' }),
    );
    const result = await createInCardController.fn.call(
      { req },
      { cardId: 'c1', position: 0, name: 'Group B' },
    );
    expect(result).toEqual({ item: { id: 'cfg2' } });
  });

  test('show handles path and access checks and returns included data', async () => {
    const req = { currentUser: { id: 'u1', role: 'member' } };
    const path = {
      customFieldGroup: { id: 'cfg1', cardId: 'c1' },
      board: { id: 'b1' },
      project: { id: 'p1', ownerProjectManagerId: null },
    };

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(showController.fn.call({ req }, { id: 'cfg1' })).rejects.toEqual({
      customFieldGroupNotFound: 'Custom field group not found',
    });

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable(path),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(showController.fn.call({ req }, { id: 'cfg1' })).rejects.toEqual({
      customFieldGroupNotFound: 'Custom field group not found',
    });

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable(path),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    CustomField.qm.getByCustomFieldGroupId.mockResolvedValueOnce([{ id: 'cf1' }]);
    CustomFieldValue.qm.getByCustomFieldGroupId.mockResolvedValueOnce([{ id: 'cfv1' }]);
    const result = await showController.fn.call({ req }, { id: 'cfg1' });

    expect(result).toEqual({
      item: { id: 'cfg1', cardId: 'c1' },
      included: {
        customFields: [{ id: 'cf1' }],
        customFieldValues: [{ id: 'cfv1' }],
      },
    });
  });

  test('show allows admin access and returns empty values for board groups', async () => {
    const req = { currentUser: { id: 'u1', role: 'admin' } };
    const path = {
      customFieldGroup: { id: 'cfg1', boardId: 'b1' },
      board: { id: 'b1' },
      project: { id: 'p1', ownerProjectManagerId: null },
    };

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable(path),
    );
    CustomField.qm.getByCustomFieldGroupId.mockResolvedValueOnce([{ id: 'cf1' }]);

    const result = await showController.fn.call({ req }, { id: 'cfg1' });

    expect(result).toEqual({
      item: { id: 'cfg1', boardId: 'b1' },
      included: {
        customFields: [{ id: 'cf1' }],
        customFieldValues: [],
      },
    });
  });

  test('update handles rights, name null intercept and not found result', async () => {
    const req = { currentUser: { id: 'u1' } };
    const path = {
      customFieldGroup: { id: 'cfg1', boardId: 'b1' },
      board: { id: 'b1' },
      project: { id: 'p1' },
    };

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(updateController.fn.call({ req }, { id: 'cfg1' })).rejects.toEqual({
      customFieldGroupNotFound: 'Custom field group not found',
    });

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable(path),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(updateController.fn.call({ req }, { id: 'cfg1' })).rejects.toEqual({
      customFieldGroupNotFound: 'Custom field group not found',
    });

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable(path),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(updateController.fn.call({ req }, { id: 'cfg1' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable(path),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.customFieldGroups.updateOneInBoard.with.mockReturnValueOnce(
      makeInterceptable({}, 'nameInValuesMustNotBeNull'),
    );
    await expect(updateController.fn.call({ req }, { id: 'cfg1', name: null })).rejects.toEqual({
      nameMustNotBeNull: 'Name must not be null',
    });

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable(path),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.customFieldGroups.updateOneInBoard.with.mockReturnValueOnce(
      makeInterceptable(null),
    );
    await expect(updateController.fn.call({ req }, { id: 'cfg1', name: 'X' })).rejects.toEqual({
      customFieldGroupNotFound: 'Custom field group not found',
    });
  });

  test('update handles card name null intercept and delete not found cases', async () => {
    const req = { currentUser: { id: 'u1' } };
    const cardPath = {
      customFieldGroup: { id: 'cfg-card', cardId: 'c1' },
      card: { id: 'c1' },
      list: { id: 'l1' },
      board: { id: 'b1' },
      project: { id: 'p1' },
    };
    const boardPath = {
      customFieldGroup: { id: 'cfg-board', boardId: 'b1' },
      board: { id: 'b1' },
      project: { id: 'p1' },
    };

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable(cardPath),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.customFieldGroups.updateOneInCard.with.mockReturnValueOnce(
      makeInterceptable({}, 'nameInValuesMustNotBeNull'),
    );
    await expect(updateController.fn.call({ req }, { id: 'cfg-card', name: null })).rejects.toEqual(
      {
        nameMustNotBeNull: 'Name must not be null',
      },
    );

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable(cardPath),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.customFieldGroups.updateOneInCard.with.mockReturnValueOnce(
      makeInterceptable({ id: 'cfg-card' }),
    );
    const updateResult = await updateController.fn.call({ req }, { id: 'cfg-card', name: 'A' });
    expect(updateResult).toEqual({ item: { id: 'cfg-card' } });

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable(boardPath),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.customFieldGroups.deleteOneInBoard.with.mockResolvedValueOnce({
      id: 'cfg-board',
    });
    const deleteBoardResult = await deleteController.fn.call({ req }, { id: 'cfg-board' });
    expect(deleteBoardResult).toEqual({ item: { id: 'cfg-board' } });

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable(boardPath),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.customFieldGroups.deleteOneInBoard.with.mockResolvedValueOnce(null);
    await expect(deleteController.fn.call({ req }, { id: 'cfg-board' })).rejects.toEqual({
      customFieldGroupNotFound: 'Custom field group not found',
    });

    sails.helpers.customFieldGroups.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable(cardPath),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.customFieldGroups.deleteOneInCard.with.mockResolvedValueOnce({ id: 'cfg-card' });
    const deleteCardResult = await deleteController.fn.call({ req }, { id: 'cfg-card' });
    expect(deleteCardResult).toEqual({ item: { id: 'cfg-card' } });
  });
});
