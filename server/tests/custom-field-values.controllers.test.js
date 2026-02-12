const createOrUpdateController = require('../api/controllers/custom-field-values/create-or-update');
const deleteController = require('../api/controllers/custom-field-values/delete');

const originalSails = global.sails;
const originalBoardMembership = global.BoardMembership;
const originalCustomFieldGroup = global.CustomFieldGroup;
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

describe('custom-field-values controllers', () => {
  beforeEach(() => {
    global._ = require('lodash'); // eslint-disable-line global-require

    global.sails = {
      helpers: {
        cards: {
          getPathToProjectById: jest.fn(),
        },
        customFieldValues: {
          createOrUpdateOne: {
            with: jest.fn(),
          },
          deleteOne: {
            with: jest.fn(),
          },
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

    global.CustomFieldGroup = {
      qm: {
        getOneById: jest.fn(),
      },
    };

    global.CustomField = {
      qm: {
        getOneById: jest.fn(),
      },
    };

    global.CustomFieldValue = {
      qm: {
        getOneByCardIdAndCustomFieldGroupIdAndCustomFieldId: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.BoardMembership = originalBoardMembership;
    global.CustomFieldGroup = originalCustomFieldGroup;
    global.CustomField = originalCustomField;
    global.CustomFieldValue = originalCustomFieldValue;
    global._ = originalLodash;
  });

  test('create-or-update handles path, access, and record checks', async () => {
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
      createOrUpdateController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1', content: 'X' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(
      createOrUpdateController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1', content: 'X' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(
      createOrUpdateController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1', content: 'X' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    CustomFieldGroup.qm.getOneById.mockResolvedValueOnce(null);
    await expect(
      createOrUpdateController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1', content: 'X' },
      ),
    ).rejects.toEqual({
      customFieldGroupNotFound: 'Custom field group not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    CustomFieldGroup.qm.getOneById.mockResolvedValueOnce({ id: 'cfg1', boardId: 'b2' });
    await expect(
      createOrUpdateController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1', content: 'X' },
      ),
    ).rejects.toEqual({
      customFieldGroupNotFound: 'Custom field group not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    CustomFieldGroup.qm.getOneById.mockResolvedValueOnce({ id: 'cfg1', cardId: 'c2' });
    await expect(
      createOrUpdateController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1', content: 'X' },
      ),
    ).rejects.toEqual({
      customFieldGroupNotFound: 'Custom field group not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    CustomFieldGroup.qm.getOneById.mockResolvedValueOnce({ id: 'cfg1', cardId: 'c1' });
    CustomField.qm.getOneById.mockResolvedValueOnce(null);
    await expect(
      createOrUpdateController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1', content: 'X' },
      ),
    ).rejects.toEqual({
      customFieldNotFound: 'Custom field not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    CustomFieldGroup.qm.getOneById.mockResolvedValueOnce({
      id: 'cfg1',
      cardId: 'c1',
      baseCustomFieldGroupId: 'bcfg1',
    });
    CustomField.qm.getOneById.mockResolvedValueOnce({
      id: 'cf1',
      baseCustomFieldGroupId: 'bcfg2',
    });
    await expect(
      createOrUpdateController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1', content: 'X' },
      ),
    ).rejects.toEqual({
      customFieldNotFound: 'Custom field not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    CustomFieldGroup.qm.getOneById.mockResolvedValueOnce({ id: 'cfg1', cardId: 'c1' });
    CustomField.qm.getOneById.mockResolvedValueOnce({ id: 'cf1', customFieldGroupId: 'cfg2' });
    await expect(
      createOrUpdateController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1', content: 'X' },
      ),
    ).rejects.toEqual({
      customFieldNotFound: 'Custom field not found',
    });
  });

  test('create-or-update creates a value with scoped records', async () => {
    const req = { currentUser: { id: 'u1' } };
    const path = {
      card: { id: 'c1' },
      list: { id: 'l1' },
      board: { id: 'b1' },
      project: { id: 'p1' },
    };
    const customFieldGroup = { id: 'cfg1', cardId: 'c1' };
    const customField = { id: 'cf1', customFieldGroupId: 'cfg1' };

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    CustomFieldGroup.qm.getOneById.mockResolvedValueOnce(customFieldGroup);
    CustomField.qm.getOneById.mockResolvedValueOnce(customField);
    sails.helpers.customFieldValues.createOrUpdateOne.with.mockResolvedValueOnce({ id: 'cfv1' });

    const result = await createOrUpdateController.fn.call(
      { req },
      { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1', content: 'X' },
    );

    expect(result).toEqual({ item: { id: 'cfv1' } });
    expect(sails.helpers.customFieldValues.createOrUpdateOne.with).toHaveBeenCalledWith({
      project: path.project,
      board: path.board,
      list: path.list,
      values: {
        content: 'X',
        card: path.card,
        customFieldGroup,
        customField,
      },
      actorUser: req.currentUser,
      request: req,
    });
  });

  test('delete handles missing records and rights', async () => {
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
      deleteController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(
      deleteController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(
      deleteController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    CustomFieldGroup.qm.getOneById.mockResolvedValueOnce(null);
    await expect(
      deleteController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1' },
      ),
    ).rejects.toEqual({
      customFieldGroupNotFound: 'Custom field group not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    CustomFieldGroup.qm.getOneById.mockResolvedValueOnce({ id: 'cfg1', cardId: 'c1' });
    CustomFieldValue.qm.getOneByCardIdAndCustomFieldGroupIdAndCustomFieldId.mockResolvedValueOnce(
      null,
    );
    await expect(
      deleteController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1' },
      ),
    ).rejects.toEqual({
      customFieldValueNotFound: 'Custom field value not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    CustomFieldGroup.qm.getOneById.mockResolvedValueOnce({ id: 'cfg1', cardId: 'c1' });
    CustomFieldValue.qm.getOneByCardIdAndCustomFieldGroupIdAndCustomFieldId.mockResolvedValueOnce({
      id: 'cfv1',
    });
    sails.helpers.customFieldValues.deleteOne.with.mockResolvedValueOnce(null);
    await expect(
      deleteController.fn.call(
        { req },
        { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1' },
      ),
    ).rejects.toEqual({
      customFieldValueNotFound: 'Custom field value not found',
    });
  });

  test('delete removes a custom field value', async () => {
    const req = { currentUser: { id: 'u1' } };
    const path = {
      card: { id: 'c1' },
      list: { id: 'l1' },
      board: { id: 'b1' },
      project: { id: 'p1' },
    };

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    CustomFieldGroup.qm.getOneById.mockResolvedValueOnce({ id: 'cfg1', cardId: 'c1' });
    CustomFieldValue.qm.getOneByCardIdAndCustomFieldGroupIdAndCustomFieldId.mockResolvedValueOnce({
      id: 'cfv1',
    });
    sails.helpers.customFieldValues.deleteOne.with.mockResolvedValueOnce({ id: 'cfv1' });

    const result = await deleteController.fn.call(
      { req },
      { cardId: 'c1', customFieldGroupId: 'cfg1', customFieldId: 'cf1' },
    );

    expect(result).toEqual({ item: { id: 'cfv1' } });
  });
});
