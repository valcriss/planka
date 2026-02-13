const clearHttpOnlyTokenCookie = require('../api/helpers/utils/clear-http-only-token-cookie');
const setHttpOnlyTokenCookie = require('../api/helpers/utils/set-http-only-token-cookie');

const originalSails = global.sails;

describe('helpers/utils/http-only-token-cookie', () => {
  beforeEach(() => {
    global.sails = {
      config: {
        custom: {
          baseUrlPath: '/base',
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

  test('sets http-only token cookie', () => {
    const response = {
      cookie: jest.fn(),
    };

    const exp = 1700000000;

    setHttpOnlyTokenCookie.fn({
      value: 'token-1',
      accessTokenPayload: { exp },
      response,
    });

    expect(response.cookie).toHaveBeenCalledWith('httpOnlyToken', 'token-1', {
      expires: new Date(exp * 1000),
      path: '/base',
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
    });
  });

  test('clears http-only token cookie', () => {
    const response = {
      clearCookie: jest.fn(),
    };

    clearHttpOnlyTokenCookie.fn({ response });

    expect(response.clearCookie).toHaveBeenCalledWith('httpOnlyToken', {
      path: '/base',
    });
  });
});
