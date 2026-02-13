const lodash = require('lodash');
const updateBaseCustomFieldGroup = require('../api/helpers/base-custom-field-groups/update-one');
const deleteBaseCustomFieldGroup = require('../api/helpers/base-custom-field-groups/delete-one');
const deleteBaseCustomFieldGroupRelated = require('../api/helpers/base-custom-field-groups/delete-related');

const originalSails = global.sails;
const originalBaseCustomFieldGroup = global.BaseCustomFieldGroup;
const originalCustomFieldGroup = global.CustomFieldGroup;
const originalCustomField = global.CustomField;
const originalWebhook = global.Webhook;
const originalLodash = global._;
describe('helpers/base-custom-field-groups lifecycle', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      helpers: {
        baseCustomFieldGroups: {
          deleteRelated: jest.fn(),
        },
        customFieldGroups: {
          deleteRelated: jest.fn(),
        },
        projects: {
          makeScoper: {
            with: jest.fn(),
          },
        },
        utils: {
          mapRecords: jest.fn((records) => records.map((record) => record.id)),
          sendWebhooks: {
            with: jest.fn(),
          },
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };
    global.BaseCustomFieldGroup = {
      qm: {
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
    global.CustomFieldGroup = {
      qm: {
        delete: jest.fn().mockResolvedValue([{ id: 'cfg-1' }]),
      },
    };
    global.CustomField = {
      qm: {
        delete: jest.fn().mockResolvedValue(),
      },
    };
    global.Webhook = {
      Events: {
        BASE_CUSTOM_FIELD_GROUP_UPDATE: 'baseCustomFieldGroupUpdate',
        BASE_CUSTOM_FIELD_GROUP_DELETE: 'baseCustomFieldGroupDelete',
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
    if (typeof originalBaseCustomFieldGroup === 'undefined') {
      delete global.BaseCustomFieldGroup;
    } else {
      global.BaseCustomFieldGroup = originalBaseCustomFieldGroup;
    }
    if (typeof originalCustomFieldGroup === 'undefined') {
      delete global.CustomFieldGroup;
    } else {
      global.CustomFieldGroup = originalCustomFieldGroup;
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
  test('updates base custom field group and sends webhooks', async () => {
    BaseCustomFieldGroup.qm.updateOne.mockResolvedValue({ id: 'bcfg-1' });
    const scoper = {
      getProjectRelatedUserIds: jest.fn().mockResolvedValue(['user-1', 'user-2']),
    };
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);
    const result = await updateBaseCustomFieldGroup.fn({
      record: { id: 'bcfg-1', name: 'Old' },
      values: { name: 'New' },
      project: { id: 'project-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });
    expect(result).toEqual({ id: 'bcfg-1' });
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
    const webhookCall = sails.helpers.utils.sendWebhooks.with.mock.calls[0][0];
    expect(webhookCall.buildPrevData().item).toEqual({
      id: 'bcfg-1',
      name: 'Old',
    });
  });
  test('returns null when update fails', async () => {
    BaseCustomFieldGroup.qm.updateOne.mockResolvedValue(null);
    const result = await updateBaseCustomFieldGroup.fn({
      record: { id: 'bcfg-2' },
      values: { name: 'New' },
      project: { id: 'project-2' },
      actorUser: { id: 'actor-2' },
    });
    expect(result).toBeNull();
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });
  test('deletes base custom field group and related data', async () => {
    BaseCustomFieldGroup.qm.deleteOne.mockResolvedValue({ id: 'bcfg-3' });
    const scoper = {
      getProjectRelatedUserIds: jest.fn().mockResolvedValue(['user-3']),
    };
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);
    const result = await deleteBaseCustomFieldGroup.fn({
      record: { id: 'bcfg-3' },
      project: { id: 'project-3' },
      actorUser: { id: 'actor-3' },
      request: { id: 'req-3' },
    });
    expect(result).toEqual({ id: 'bcfg-3' });
    expect(sails.helpers.baseCustomFieldGroups.deleteRelated).toHaveBeenCalledWith({
      id: 'bcfg-3',
    });
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'user:user-3',
      'baseCustomFieldGroupDelete',
      { item: { id: 'bcfg-3' } },
      { id: 'req-3' },
    );
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('returns null when delete fails', async () => {
    BaseCustomFieldGroup.qm.deleteOne.mockResolvedValue(null);
    const result = await deleteBaseCustomFieldGroup.fn({
      record: { id: 'bcfg-4' },
      project: { id: 'project-4' },
      actorUser: { id: 'actor-4' },
    });
    expect(result).toBeNull();
    expect(sails.helpers.baseCustomFieldGroups.deleteRelated).toHaveBeenCalledWith({
      id: 'bcfg-4',
    });
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });
  test('deletes related records by single record', async () => {
    await deleteBaseCustomFieldGroupRelated.fn({
      recordOrRecords: { id: 'bcfg-5' },
    });
    expect(CustomFieldGroup.qm.delete).toHaveBeenCalledWith({
      baseCustomFieldGroupId: 'bcfg-5',
    });
    expect(sails.helpers.customFieldGroups.deleteRelated).toHaveBeenCalled();
    expect(CustomField.qm.delete).toHaveBeenCalledWith({
      baseCustomFieldGroupId: 'bcfg-5',
    });
  });
  test('deletes related records by list of records', async () => {
    await deleteBaseCustomFieldGroupRelated.fn({
      recordOrRecords: [{ id: 'bcfg-6' }, { id: 'bcfg-7' }],
    });
    expect(sails.helpers.utils.mapRecords).toHaveBeenCalled();
    expect(CustomFieldGroup.qm.delete).toHaveBeenCalledWith({
      baseCustomFieldGroupId: ['bcfg-6', 'bcfg-7'],
    });
    expect(CustomField.qm.delete).toHaveBeenCalledWith({
      baseCustomFieldGroupId: ['bcfg-6', 'bcfg-7'],
    });
  });
});
