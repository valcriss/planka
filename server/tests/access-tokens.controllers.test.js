jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-1'),
}));

jest.mock('../utils/remote-address', () => ({
  getRemoteAddress: jest.fn(() => '127.0.0.1'),
}));

const bcrypt = require('bcrypt');

const createAccessTokenController = require('../api/controllers/access-tokens/create');
const exchangeWithOidcController = require('../api/controllers/access-tokens/exchange-with-oidc');

const originalSails = global.sails;
const originalSession = global.Session;
const originalUser = global.User;

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

describe('access-tokens controllers', () => {
  beforeEach(() => {
    bcrypt.compare.mockReset();

    global.sails = {
      config: {
        custom: {
          oidcEnforced: false,
          showDetailedAuthErrors: true,
        },
      },
      helpers: {
        users: {
          getOrCreateOneWithOidc: jest.fn(),
        },
        utils: {
          createJwtToken: jest.fn(() => ({
            token: 'token-1',
            payload: { sub: 'user-1' },
          })),
          setHttpOnlyTokenCookie: jest.fn(),
        },
      },
      log: {
        warn: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
      },
    };

    global.Session = {
      qm: {
        createOne: jest.fn(),
      },
    };

    global.User = {
      qm: {
        getOneActiveByEmailOrUsername: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.Session = originalSession;
    global.User = originalUser;
  });

  test('access-tokens/create rejects when OIDC is enforced', async () => {
    sails.config.custom.oidcEnforced = true;

    await expect(
      createAccessTokenController.fn.call(
        { req: { headers: {}, isSocket: false }, res: {} },
        { emailOrUsername: 'user@example.com', password: 'secret' },
      ),
    ).rejects.toEqual({
      useSingleSignOn: 'Use single sign-on',
    });
  });

  test('access-tokens/create rejects when user is missing', async () => {
    User.qm.getOneActiveByEmailOrUsername.mockResolvedValue(null);

    await expect(
      createAccessTokenController.fn.call(
        { req: { headers: {}, isSocket: false }, res: {} },
        { emailOrUsername: 'user@example.com', password: 'secret' },
      ),
    ).rejects.toEqual({
      invalidEmailOrUsername: 'Invalid email or username',
    });
  });

  test('access-tokens/create rejects when password is invalid', async () => {
    User.qm.getOneActiveByEmailOrUsername.mockResolvedValue({
      id: 'user-1',
      password: 'hashed',
      isSsoUser: false,
    });
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      createAccessTokenController.fn.call(
        { req: { headers: {}, isSocket: false }, res: {} },
        { emailOrUsername: 'user@example.com', password: 'secret' },
      ),
    ).rejects.toEqual({
      invalidPassword: 'Invalid password',
    });
  });

  test('access-tokens/create creates session and sets httpOnly cookie', async () => {
    User.qm.getOneActiveByEmailOrUsername.mockResolvedValue({
      id: 'user-1',
      password: 'hashed',
      isSsoUser: false,
    });
    bcrypt.compare.mockResolvedValue(true);

    const req = { headers: { 'user-agent': 'jest' }, isSocket: false };
    const res = {};

    const result = await createAccessTokenController.fn.call(
      { req, res },
      {
        emailOrUsername: 'user@example.com',
        password: 'secret',
        withHttpOnlyToken: true,
      },
    );

    expect(Session.qm.createOne).toHaveBeenCalledWith({
      accessToken: 'token-1',
      httpOnlyToken: 'uuid-1',
      remoteAddress: '127.0.0.1',
      userId: 'user-1',
      userAgent: 'jest',
    });
    expect(sails.helpers.utils.setHttpOnlyTokenCookie).toHaveBeenCalledWith(
      'uuid-1',
      { sub: 'user-1' },
      res,
    );
    expect(result).toEqual({ item: 'token-1' });
  });

  test('access-tokens/exchange-with-oidc maps invalid code or nonce', async () => {
    sails.helpers.users.getOrCreateOneWithOidc.mockReturnValue(
      buildInterceptedPromise({ error: 'invalidCodeOrNonce' }),
    );

    await expect(
      exchangeWithOidcController.fn.call(
        { req: { headers: {}, isSocket: false }, res: {} },
        { code: 'code', nonce: 'nonce' },
      ),
    ).rejects.toEqual({
      invalidCodeOrNonce: 'Invalid code or nonce',
    });

    expect(sails.log.warn).toHaveBeenCalled();
  });

  test('access-tokens/exchange-with-oidc creates session and cookie', async () => {
    sails.helpers.users.getOrCreateOneWithOidc.mockReturnValue(
      buildInterceptedPromise({
        result: {
          user: { id: 'user-1' },
          idToken: 'id-token',
        },
      }),
    );

    const req = { headers: { 'user-agent': 'jest' }, isSocket: false };
    const res = {};

    const result = await exchangeWithOidcController.fn.call(
      { req, res },
      { code: 'code', nonce: 'nonce', withHttpOnlyToken: true },
    );

    expect(Session.qm.createOne).toHaveBeenCalledWith({
      accessToken: 'token-1',
      httpOnlyToken: 'uuid-1',
      remoteAddress: '127.0.0.1',
      userId: 'user-1',
      userAgent: 'jest',
      oidcIdToken: 'id-token',
    });
    expect(sails.helpers.utils.setHttpOnlyTokenCookie).toHaveBeenCalledWith(
      'uuid-1',
      { sub: 'user-1' },
      res,
    );
    expect(result).toEqual({ item: 'token-1' });
  });
});
