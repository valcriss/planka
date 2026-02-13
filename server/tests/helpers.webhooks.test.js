const lodash = require('lodash');

const createWebhook = require('../api/helpers/webhooks/create-one');
const deleteWebhook = require('../api/helpers/webhooks/delete-one');
const updateWebhook = require('../api/helpers/webhooks/update-one');

const originalSails = global.sails;
const originalWebhook = global.Webhook;
const originalLodash = global._;

describe('helpers/webhooks', () => {
  beforeEach(() => {
    global._ = lodash;

    global.sails = {
      helpers: {
        users: {
          makeScoper: jest.fn(),
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

    global.Webhook = {
      Events: {
        WEBHOOK_CREATE: 'webhookCreate',
        WEBHOOK_DELETE: 'webhookDelete',
        WEBHOOK_UPDATE: 'webhookUpdate',
      },
      qm: {
        getAll: jest.fn(),
        createOne: jest.fn(),
        deleteOne: jest.fn(),
        updateOne: jest.fn(),
      },
    };

    const scoper = {
      getPrivateUserRelatedUserIds: jest.fn().mockResolvedValue(['user-1', 'user-2']),
    };
    sails.helpers.users.makeScoper.mockReturnValue(scoper);
  });

  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
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

  test('throws when webhook limit reached', async () => {
    Webhook.qm.getAll.mockResolvedValue(new Array(10).fill({ id: 'wh' }));

    await expect(
      createWebhook.fn({
        values: { url: 'https://example.test' },
        actorUser: { id: 'actor-1' },
      }),
    ).rejects.toBe('limitReached');
  });

  test('creates webhook and filters events', async () => {
    Webhook.qm.getAll.mockResolvedValue([{ id: 'wh-1' }]);
    Webhook.qm.createOne.mockResolvedValue({
      id: 'wh-2',
      url: 'https://example.test',
    });

    const result = await createWebhook.fn({
      values: {
        url: 'https://example.test',
        events: ['webhookCreate', 'invalidEvent'],
        excludedEvents: ['webhookDelete'],
      },
      actorUser: { id: 'actor-2' },
      request: { id: 'req-1' },
    });

    expect(result).toEqual({ id: 'wh-2', url: 'https://example.test' });
    expect(Webhook.qm.createOne).toHaveBeenCalledWith({
      url: 'https://example.test',
      events: ['webhookCreate'],
    });
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalledWith(
      expect.objectContaining({
        event: Webhook.Events.WEBHOOK_CREATE,
      }),
    );
  });

  test('updates webhook and filters excluded events', async () => {
    Webhook.qm.updateOne.mockResolvedValue({
      id: 'wh-3',
      url: 'https://example.test',
    });
    Webhook.qm.getAll.mockResolvedValue([{ id: 'wh-1' }, { id: 'wh-3' }]);

    const result = await updateWebhook.fn({
      record: { id: 'wh-3', url: 'https://example.test' },
      values: {
        excludedEvents: ['webhookDelete', 'invalidEvent'],
      },
      actorUser: { id: 'actor-3' },
      request: { id: 'req-2' },
    });

    expect(result).toEqual({ id: 'wh-3', url: 'https://example.test' });
    expect(Webhook.qm.updateOne).toHaveBeenCalledWith('wh-3', {
      events: null,
      excludedEvents: ['webhookDelete'],
    });
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
    const webhookCall = sails.helpers.utils.sendWebhooks.with.mock.calls[0][0];
    expect(webhookCall.buildPrevData().item).toEqual({
      id: 'wh-3',
      url: 'https://example.test',
    });
  });

  test('deletes webhook and sends notifications', async () => {
    Webhook.qm.getAll.mockResolvedValue([{ id: 'wh-1' }]);
    Webhook.qm.deleteOne.mockResolvedValue({ id: 'wh-4' });

    const result = await deleteWebhook.fn({
      record: { id: 'wh-4' },
      actorUser: { id: 'actor-4' },
      request: { id: 'req-3' },
    });

    expect(result).toEqual({ id: 'wh-4' });
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalledWith(
      expect.objectContaining({
        event: Webhook.Events.WEBHOOK_DELETE,
      }),
    );
  });

  test('returns null when delete fails', async () => {
    Webhook.qm.getAll.mockResolvedValue([{ id: 'wh-1' }]);
    Webhook.qm.deleteOne.mockResolvedValue(null);

    const result = await deleteWebhook.fn({
      record: { id: 'wh-5' },
      actorUser: { id: 'actor-5' },
    });

    expect(result).toBeNull();
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });

  test('returns null when update fails', async () => {
    Webhook.qm.updateOne.mockResolvedValue(null);

    const result = await updateWebhook.fn({
      record: { id: 'wh-6' },
      values: { url: 'https://example.test' },
      actorUser: { id: 'actor-6' },
    });

    expect(result).toBeNull();
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });
});
