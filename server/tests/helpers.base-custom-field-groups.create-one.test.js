const createBaseCustomFieldGroup = require('../api/helpers/base-custom-field-groups/create-one');

const originalSails = global.sails;
const originalBaseCustomFieldGroup = global.BaseCustomFieldGroup;
const originalWebhook = global.Webhook;

describe('helpers/base-custom-field-groups/create-one', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        projects: {
          makeScoper: {
            with: jest.fn(),
          },
        },
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

    global.BaseCustomFieldGroup = {
      qm: {
        createOne: jest.fn(),
      },
    };

    global.Webhook = {
      Events: {
        BASE_CUSTOM_FIELD_GROUP_CREATE: 'baseCustomFieldGroupCreate',
      },
      qm: {
        getAll: jest.fn(),
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

    if (typeof originalWebhook === 'undefined') {
      delete global.Webhook;
    } else {
      global.Webhook = originalWebhook;
    }
  });

  test('creates base group, broadcasts to project users, and sends webhooks', async () => {
    const baseCustomFieldGroup = { id: 'bcfg-1' };
    const scoper = {
      getProjectRelatedUserIds: jest.fn().mockResolvedValue(['user-1', 'user-2']),
    };

    BaseCustomFieldGroup.qm.createOne.mockResolvedValue(baseCustomFieldGroup);
    Webhook.qm.getAll.mockResolvedValue([{ id: 'wh-1' }]);
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);

    const inputs = {
      values: { project: { id: 'project-1' } },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    };

    const result = await createBaseCustomFieldGroup.fn(inputs);

    expect(result).toBe(baseCustomFieldGroup);
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalledTimes(1);
  });
});
