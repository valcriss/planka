const createController = require('../api/controllers/webhooks/create');
const deleteController = require('../api/controllers/webhooks/delete');
const indexController = require('../api/controllers/webhooks/index');
const updateController = require('../api/controllers/webhooks/update');

const originalSails = global.sails;
const originalWebhook = global.Webhook;
const originalLodash = global._;

const buildInterceptedPromise = ({ result, error }) => {
  const basePromise = error ? Promise.reject(error) : Promise.resolve(result);

  const wrapPromise = (promise) => ({
    intercept: (code, handler) =>
      wrapPromise(
        promise.catch((err) => {
          if (err === code || (err && err.code === code)) {
            throw handler();
          }
          throw err;
        }),
      ),
    then: (...args) => promise.then(...args),
    catch: (...args) => promise.catch(...args),
    finally: (...args) => promise.finally(...args),
  });

  return wrapPromise(basePromise);
};

describe('webhooks controllers', () => {
  beforeEach(() => {
    global._ = require('lodash'); // eslint-disable-line global-require

    global.sails = {
      helpers: {
        webhooks: {
          createOne: {
            with: jest.fn(),
          },
          deleteOne: {
            with: jest.fn(),
          },
          updateOne: {
            with: jest.fn(),
          },
        },
      },
    };

    global.Webhook = {
      qm: {
        getOneById: jest.fn(),
        getAll: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.Webhook = originalWebhook;
    global._ = originalLodash;
  });

  test('webhooks/create maps limitReached and returns webhook', async () => {
    sails.helpers.webhooks.createOne.with.mockReturnValueOnce(
      buildInterceptedPromise({ error: 'limitReached' }),
    );

    await expect(
      createController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { name: 'Hook', url: 'https://example.com' },
      ),
    ).rejects.toEqual({
      limitReached: 'Limit reached',
    });

    sails.helpers.webhooks.createOne.with.mockReturnValueOnce(
      buildInterceptedPromise({ result: { id: 'w1' } }),
    );

    const result = await createController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      {
        name: 'Hook',
        url: 'https://example.com',
        accessToken: 'token',
        events: 'cards.create,cards.update',
        excludedEvents: 'cards.delete',
      },
    );

    expect(sails.helpers.webhooks.createOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: {
          name: 'Hook',
          url: 'https://example.com',
          accessToken: 'token',
          events: ['cards.create', 'cards.update'],
          excludedEvents: ['cards.delete'],
        },
      }),
    );
    expect(result).toEqual({ item: { id: 'w1' } });
  });

  test('webhooks/index returns webhooks', async () => {
    Webhook.qm.getAll.mockResolvedValue([{ id: 'w1' }]);

    const result = await indexController.fn();

    expect(result).toEqual({ items: [{ id: 'w1' }] });
  });

  test('webhooks/delete handles missing webhook and delete result', async () => {
    Webhook.qm.getOneById.mockResolvedValueOnce(null);

    await expect(
      deleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'w1' }),
    ).rejects.toEqual({
      webhookNotFound: 'Webhook not found',
    });

    Webhook.qm.getOneById.mockResolvedValueOnce({ id: 'w1' });
    sails.helpers.webhooks.deleteOne.with.mockResolvedValueOnce(null);

    await expect(
      deleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'w1' }),
    ).rejects.toEqual({
      webhookNotFound: 'Webhook not found',
    });
  });

  test('webhooks/delete removes webhook', async () => {
    Webhook.qm.getOneById.mockResolvedValue({ id: 'w1' });
    sails.helpers.webhooks.deleteOne.with.mockResolvedValue({ id: 'w1' });

    const result = await deleteController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'w1' },
    );

    expect(result).toEqual({ item: { id: 'w1' } });
  });

  test('webhooks/update handles missing webhook and updates', async () => {
    Webhook.qm.getOneById.mockResolvedValueOnce(null);

    await expect(
      updateController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'w1', name: 'Hook' }),
    ).rejects.toEqual({
      webhookNotFound: 'Webhook not found',
    });

    Webhook.qm.getOneById.mockResolvedValueOnce({ id: 'w1' });
    sails.helpers.webhooks.updateOne.with.mockResolvedValueOnce(null);

    await expect(
      updateController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'w1', name: 'Hook' }),
    ).rejects.toEqual({
      webhookNotFound: 'Webhook not found',
    });

    Webhook.qm.getOneById.mockResolvedValueOnce({ id: 'w1' });
    sails.helpers.webhooks.updateOne.with.mockResolvedValueOnce({ id: 'w1' });

    const result = await updateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      {
        id: 'w1',
        name: 'Hook',
        url: 'https://example.com',
        accessToken: 'token',
        events: 'cards.create,cards.update',
      },
    );

    expect(sails.helpers.webhooks.updateOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: {
          name: 'Hook',
          url: 'https://example.com',
          accessToken: 'token',
          events: ['cards.create', 'cards.update'],
          excludedEvents: undefined,
        },
      }),
    );
    expect(result).toEqual({ item: { id: 'w1' } });
  });
});
