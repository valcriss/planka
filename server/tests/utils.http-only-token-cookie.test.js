const originalSails = global.sails;

const clearHelper = require('../api/helpers/utils/clear-http-only-token-cookie');
const setHelper = require('../api/helpers/utils/set-http-only-token-cookie');

describe('http-only token cookie helpers', () => {
  beforeEach(() => {
    global.sails = {
      config: {
        custom: {
          baseUrlPath: '/planka',
          baseUrlSecure: true,
        },
      },
    };
  });

  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }
  });

  test('clear helper clears httpOnlyToken cookie with configured path', () => {
    const response = {
      clearCookie: jest.fn(),
    };

    clearHelper.fn({
      response,
    });

    expect(response.clearCookie).toHaveBeenCalledWith('httpOnlyToken', {
      path: '/planka',
    });
  });

  test('set helper sets httpOnlyToken cookie with secure options and expiration', () => {
    const response = {
      cookie: jest.fn(),
    };

    setHelper.fn({
      value: 'jwt-value',
      accessTokenPayload: {
        exp: 1700000000,
      },
      response,
    });

    expect(response.cookie).toHaveBeenCalledWith('httpOnlyToken', 'jwt-value', {
      expires: new Date(1700000000 * 1000),
      path: '/planka',
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
    });
  });
});
