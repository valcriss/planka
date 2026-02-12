const originalSails = global.sails;

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const verifyJwtTokenHelper = require('../api/helpers/utils/verify-jwt-token');

describe('utils/verify-jwt-token helper', () => {
  beforeEach(() => {
    global.sails = {
      config: {
        session: {
          secret: 'session-secret',
        },
      },
    };
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }
  });

  test('returns subject and issuedAt when token is valid', () => {
    jwt.verify.mockReturnValue({
      sub: { id: 7 },
      iat: 1700000000,
    });

    const result = verifyJwtTokenHelper.fn({
      token: 'token-value',
    });

    expect(jwt.verify).toHaveBeenCalledWith('token-value', 'session-secret');
    expect(result).toEqual({
      subject: { id: 7 },
      issuedAt: new Date(1700000000 * 1000),
    });
  });

  test('throws invalidToken when verification fails', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('bad token');
    });

    expect(() =>
      verifyJwtTokenHelper.fn({
        token: 'token-value',
      }),
    ).toThrow('invalidToken');
  });
});
