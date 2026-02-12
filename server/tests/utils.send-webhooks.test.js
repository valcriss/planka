const sendWebhooks = require('../api/helpers/utils/send-webhooks');

const originalFetch = global.fetch;
const originalSails = global.sails;

describe('utils/send-webhooks helper', () => {
  beforeEach(() => {
    global.fetch = jest.fn();

    global.sails = {
      config: {
        custom: {
          baseUrl: 'http://localhost',
        },
      },
      helpers: {
        users: {
          presentOne: jest.fn((user) => ({ id: user.id, name: user.name })),
        },
      },
      log: {
        error: jest.fn(),
      },
    };
  });

  afterAll(() => {
    if (typeof originalFetch === 'undefined') {
      delete global.fetch;
    } else {
      global.fetch = originalFetch;
    }

    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }
  });

  test('filters webhooks and sends payload to allowed ones', async () => {
    const buildData = jest.fn(() => ({ item: { id: 'card-1' } }));
    const buildPrevData = jest.fn(() => ({ item: { id: 'card-0' } }));
    const user = { id: 'user-1', name: 'Alex' };
    const event = 'cardCreate';

    global.fetch.mockResolvedValue({ ok: true });

    sendWebhooks.fn({
      webhooks: [
        { name: 'No URL', url: '', accessToken: 'skip' },
        { name: 'Excluded', url: 'http://skip', excludedEvents: [event] },
        { name: 'Wrong Event', url: 'http://skip', events: ['cardUpdate'] },
        { name: 'Allowed', url: 'http://allowed', accessToken: 'token-1' },
      ],
      event,
      buildData,
      buildPrevData,
      user,
    });

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(buildData).toHaveBeenCalledTimes(1);
    expect(buildPrevData).toHaveBeenCalledTimes(1);
    expect(sails.helpers.users.presentOne).toHaveBeenCalledWith(user);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = global.fetch.mock.calls[0];

    expect(url).toBe('http://allowed');
    expect(options).toEqual({
      headers: {
        Authorization: 'Bearer token-1',
        'Content-Type': 'application/json',
        'User-Agent': 'planka (+http://localhost)',
      },
      body: JSON.stringify({
        event,
        data: { item: { id: 'card-1' } },
        prevData: { item: { id: 'card-0' } },
        user: { id: 'user-1', name: 'Alex' },
      }),
      method: 'POST',
    });
  });

  test('logs error when webhook response is not ok', async () => {
    const text = jest.fn().mockResolvedValue('bad');

    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      text,
    });

    sendWebhooks.fn({
      webhooks: [{ name: 'Hook', url: 'http://failed' }],
      event: 'cardCreate',
      buildData: () => ({ item: { id: 'card-1' } }),
      user: { id: 'user-1', name: 'Alex' },
    });

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(text).toHaveBeenCalledTimes(1);
    expect(sails.log.error).toHaveBeenCalledWith(
      'Webhook Hook failed with status 500 and message: bad',
    );
  });
});
