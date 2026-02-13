const lodash = require('lodash');
const createInBase = require('../api/helpers/custom-fields/create-one-in-base-custom-field-group');
const createInGroup = require('../api/helpers/custom-fields/create-one-in-custom-field-group');
const updateInBase = require('../api/helpers/custom-fields/update-one-in-base-custom-field-group');
const updateInGroup = require('../api/helpers/custom-fields/update-one-in-custom-field-group');
const deleteInBase = require('../api/helpers/custom-fields/delete-one-in-base-custom-field-group');
const deleteInGroup = require('../api/helpers/custom-fields/delete-one-in-custom-field-group');

const originalSails = global.sails;
const originalCustomField = global.CustomField;
const originalWebhook = global.Webhook;
const originalLodash = global._;
describe('helpers/custom-fields create/update/delete', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      helpers: {
        projects: {
          makeScoper: {
            with: jest.fn().mockReturnValue({
              getProjectRelatedUserIds: jest.fn().mockResolvedValue(['user-1']),
            }),
          },
        },
        utils: {
          insertToPositionables: jest.fn().mockReturnValue({ position: 5, repositions: [] }),
          sendWebhooks: {
            with: jest.fn(),
          },
        },
        customFields: {
          deleteRelated: jest.fn(),
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };
    global.CustomField = {
      qm: {
        getByBaseCustomFieldGroupId: jest.fn().mockResolvedValue([]),
        getByCustomFieldGroupId: jest.fn().mockResolvedValue([]),
        createOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
    global.Webhook = {
      Events: {
        CUSTOM_FIELD_CREATE: 'customFieldCreate',
        CUSTOM_FIELD_UPDATE: 'customFieldUpdate',
        CUSTOM_FIELD_DELETE: 'customFieldDelete',
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
    if (typeof originalCustomField === 'undefined') {
      delete global.CustomField;
    } else {
      global.CustomField = originalCustomField;
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
  test('creates custom field in base group', async () => {
    CustomField.qm.createOne.mockResolvedValue({ id: 'cf-1' });
    const result = await createInBase.fn({
      values: { baseCustomFieldGroup: { id: 'bcfg-1' } },
      project: { id: 'project-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });
    expect(result).toEqual({ id: 'cf-1' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('creates custom field in custom group', async () => {
    CustomField.qm.createOne.mockResolvedValue({ id: 'cf-2' });
    const result = await createInGroup.fn({
      values: { customFieldGroup: { id: 'cfg-1' } },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-2' },
    });
    expect(result).toEqual({ id: 'cf-2' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('throws when base group missing', async () => {
    await expect(
      createInBase.fn({
        values: {},
        project: { id: 'project-1' },
        actorUser: { id: 'actor-1' },
      }),
    ).rejects.toBe('baseCustomFieldGroupMustBeInValues');
  });
  test('updates custom field in base group', async () => {
    CustomField.qm.updateOne.mockResolvedValue({ id: 'cf-3' });
    const result = await updateInBase.fn({
      record: { id: 'cf-3', baseCustomFieldGroupId: 'bcfg-1' },
      values: { name: 'Updated' },
      project: { id: 'project-1' },
      baseCustomFieldGroup: { id: 'bcfg-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-3' },
    });
    expect(result).toEqual({ id: 'cf-3' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('updates custom field in custom group', async () => {
    CustomField.qm.updateOne.mockResolvedValue({ id: 'cf-4' });
    const result = await updateInGroup.fn({
      record: { id: 'cf-4', customFieldGroupId: 'cfg-1' },
      values: { name: 'Updated' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      customFieldGroup: { id: 'cfg-1', cardId: null },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-4' },
    });
    expect(result).toEqual({ id: 'cf-4' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('deletes custom field in base group', async () => {
    CustomField.qm.deleteOne.mockResolvedValue({ id: 'cf-5' });
    const result = await deleteInBase.fn({
      record: { id: 'cf-5' },
      project: { id: 'project-1' },
      baseCustomFieldGroup: { id: 'bcfg-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-5' },
    });
    expect(result).toEqual({ id: 'cf-5' });
    expect(sails.helpers.customFields.deleteRelated).toHaveBeenCalled();
  });
  test('deletes custom field in custom group', async () => {
    CustomField.qm.deleteOne.mockResolvedValue({ id: 'cf-6' });
    const result = await deleteInGroup.fn({
      record: { id: 'cf-6' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      customFieldGroup: { id: 'cfg-1', cardId: null },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-6' },
    });
    expect(result).toEqual({ id: 'cf-6' });
    expect(sails.helpers.customFields.deleteRelated).toHaveBeenCalled();
  });
});
