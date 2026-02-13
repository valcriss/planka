const createOrUpdate = require('../api/helpers/custom-field-values/create-or-update-one');
const deleteOne = require('../api/helpers/custom-field-values/delete-one');

const originalSails = global.sails;
const originalCustomFieldValue = global.CustomFieldValue;
const originalWebhook = global.Webhook;

describe('helpers/custom-field-values create/delete', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        utils: {
          sendWebhooks: {
            with: jest.fn(),
          },
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };

    global.CustomFieldValue = {
      qm: {
        createOrUpdateOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };

    global.Webhook = {
      Events: {
        CUSTOM_FIELD_VALUE_UPDATE: 'customFieldValueUpdate',
        CUSTOM_FIELD_VALUE_DELETE: 'customFieldValueDelete',
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

    if (typeof originalCustomFieldValue === 'undefined') {
      delete global.CustomFieldValue;
    } else {
      global.CustomFieldValue = originalCustomFieldValue;
    }

    if (typeof originalWebhook === 'undefined') {
      delete global.Webhook;
    } else {
      global.Webhook = originalWebhook;
    }
  });

  test('creates or updates custom field value and sends webhooks', async () => {
    const record = { id: 'cfv-1' };
    CustomFieldValue.qm.createOrUpdateOne.mockResolvedValue(record);

    const result = await createOrUpdate.fn({
      values: {
        card: { id: 'card-1' },
        customFieldGroup: { id: 'cfg-1' },
        customField: { id: 'cf-1' },
      },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });

    expect(result).toBe(record);
    expect(CustomFieldValue.qm.createOrUpdateOne).toHaveBeenCalledWith({
      card: { id: 'card-1' },
      customFieldGroup: { id: 'cfg-1' },
      customField: { id: 'cf-1' },
      cardId: 'card-1',
      customFieldGroupId: 'cfg-1',
      customFieldId: 'cf-1',
    });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });

  test('deletes custom field value and sends webhooks', async () => {
    const record = { id: 'cfv-2' };
    CustomFieldValue.qm.deleteOne.mockResolvedValue(record);

    const result = await deleteOne.fn({
      record,
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1' },
      customFieldGroup: { id: 'cfg-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-2' },
    });

    expect(result).toBe(record);
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
});
