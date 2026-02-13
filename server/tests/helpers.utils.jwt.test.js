const jwt = require('jsonwebtoken');

const createJwtToken = require('../api/helpers/utils/create-jwt-token');
const verifyJwtToken = require('../api/helpers/utils/verify-jwt-token');

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'key-1'),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

const originalSails = global.sails;

describe('helpers/utils/jwt', () => {
  beforeEach(() => {
    jwt.sign.mockReset();
    jwt.verify.mockReset();

    global.sails = {
      config: {
        session: {
          secret: 'secret-1',
        },
        custom: {
          tokenExpiresIn: 7,
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

  test('creates jwt token with payload', () => {
    jwt.sign.mockReturnValue('token-1');

    const issuedAt = new Date('2024-01-01T00:00:00Z');
    const iat = Math.floor(issuedAt / 1000);
    const exp = iat + 7 * 24 * 60 * 60;

    const result = createJwtToken.fn({
      subject: { id: 'user-1' },
      issuedAt,
    });

    expect(jwt.sign).toHaveBeenCalledWith(
      {
        iat,
        exp,
        sub: { id: 'user-1' },
      },
      'secret-1',
      { keyid: 'key-1' },
    );
    expect(result).toEqual({
      token: 'token-1',
      payload: {
        iat,
        exp,
        sub: { id: 'user-1' },
      },
    });
  });

  test('verifies jwt token and returns subject', () => {
    jwt.verify.mockReturnValue({
      sub: { id: 'user-2' },
      iat: 1700000000,
    });

    const result = verifyJwtToken.fn({ token: 'token-2' });

    expect(result).toEqual({
      subject: { id: 'user-2' },
      issuedAt: new Date(1700000000 * 1000),
    });
  });

  test('throws invalidToken when verification fails', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    expect(() => verifyJwtToken.fn({ token: 'token-3' })).toThrow('invalidToken');
  });
});
