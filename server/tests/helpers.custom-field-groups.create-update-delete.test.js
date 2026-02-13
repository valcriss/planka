const lodash = require('lodash');
const createInBoard = require('../api/helpers/custom-field-groups/create-one-in-board');
const createInCard = require('../api/helpers/custom-field-groups/create-one-in-card');
const updateInBoard = require('../api/helpers/custom-field-groups/update-one-in-board');
const updateInCard = require('../api/helpers/custom-field-groups/update-one-in-card');
const deleteInBoard = require('../api/helpers/custom-field-groups/delete-one-in-board');
const deleteInCard = require('../api/helpers/custom-field-groups/delete-one-in-card');

const originalSails = global.sails;
const originalCustomFieldGroup = global.CustomFieldGroup;
const originalWebhook = global.Webhook;
const originalLodash = global._;
describe('helpers/custom-field-groups create/update/delete', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      helpers: {
        utils: {
          insertToPositionables: jest.fn().mockReturnValue({ position: 10, repositions: [] }),
          sendWebhooks: {
            with: jest.fn(),
          },
        },
        customFieldGroups: {
          deleteRelated: jest.fn(),
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };
    global.CustomFieldGroup = {
      qm: {
        getByBoardId: jest.fn().mockResolvedValue([]),
        getByCardId: jest.fn().mockResolvedValue([]),
        createOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
    global.Webhook = {
      Events: {
        CUSTOM_FIELD_GROUP_CREATE: 'customFieldGroupCreate',
        CUSTOM_FIELD_GROUP_UPDATE: 'customFieldGroupUpdate',
        CUSTOM_FIELD_GROUP_DELETE: 'customFieldGroupDelete',
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
    if (typeof originalCustomFieldGroup === 'undefined') {
      delete global.CustomFieldGroup;
    } else {
      global.CustomFieldGroup = originalCustomFieldGroup;
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
  test('creates custom field group on board', async () => {
    CustomFieldGroup.qm.createOne.mockResolvedValue({
      id: 'cfg-1',
      boardId: 'board-1',
    });
    const result = await createInBoard.fn({
      values: { board: { id: 'board-1' }, name: 'Group' },
      project: { id: 'project-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });
    expect(result).toEqual({ id: 'cfg-1', boardId: 'board-1' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('creates custom field group on card', async () => {
    CustomFieldGroup.qm.createOne.mockResolvedValue({
      id: 'cfg-2',
      cardId: 'card-1',
    });
    const result = await createInCard.fn({
      values: { card: { id: 'card-1' }, name: 'Group' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-2' },
    });
    expect(result).toEqual({ id: 'cfg-2', cardId: 'card-1' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('throws when board is missing on create-in-board', async () => {
    await expect(
      createInBoard.fn({
        values: { name: 'Group' },
        project: { id: 'project-1' },
        actorUser: { id: 'actor-1' },
      }),
    ).rejects.toBe('boardMustBeInValues');
  });
  test('updates group on board and sends webhooks', async () => {
    CustomFieldGroup.qm.updateOne.mockResolvedValue({
      id: 'cfg-3',
      boardId: 'board-1',
    });
    const result = await updateInBoard.fn({
      record: { id: 'cfg-3', boardId: 'board-1', baseCustomFieldGroupId: null },
      values: { name: 'Updated' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-3' },
    });
    expect(result).toEqual({ id: 'cfg-3', boardId: 'board-1' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('updates group on card and sends webhooks', async () => {
    CustomFieldGroup.qm.updateOne.mockResolvedValue({
      id: 'cfg-4',
      cardId: 'card-1',
    });
    const result = await updateInCard.fn({
      record: { id: 'cfg-4', cardId: 'card-1', baseCustomFieldGroupId: null },
      values: { name: 'Updated' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-4' },
    });
    expect(result).toEqual({ id: 'cfg-4', cardId: 'card-1' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('deletes group on board', async () => {
    CustomFieldGroup.qm.deleteOne.mockResolvedValue({
      id: 'cfg-5',
      boardId: 'board-1',
    });
    const result = await deleteInBoard.fn({
      record: { id: 'cfg-5' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-5' },
    });
    expect(result).toEqual({ id: 'cfg-5', boardId: 'board-1' });
    expect(sails.helpers.customFieldGroups.deleteRelated).toHaveBeenCalled();
  });
  test('deletes group on card', async () => {
    CustomFieldGroup.qm.deleteOne.mockResolvedValue({
      id: 'cfg-6',
      cardId: 'card-1',
    });
    const result = await deleteInCard.fn({
      record: { id: 'cfg-6' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-6' },
    });
    expect(result).toEqual({ id: 'cfg-6', cardId: 'card-1' });
    expect(sails.helpers.customFieldGroups.deleteRelated).toHaveBeenCalled();
  });
});
