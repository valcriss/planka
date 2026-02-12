const originalSails = global.sails;

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-1'),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
}));

const jwt = require('jsonwebtoken');
const createJwtTokenHelper = require('../api/helpers/utils/create-jwt-token');

describe('utils/create-jwt-token helper', () => {
  beforeEach(() => {
    global.sails = {
      config: {
        custom: {
          tokenExpiresIn: 2,
        },
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

  test('builds payload and signs token with provided issuedAt', () => {
    const issuedAt = new Date('2026-01-01T00:00:00.000Z');

    const result = createJwtTokenHelper.fn({
      subject: { id: 123 },
      issuedAt,
    });

    const iat = Math.floor(issuedAt / 1000);
    expect(jwt.sign).toHaveBeenCalledWith(
      {
        iat,
        exp: iat + 2 * 24 * 60 * 60,
        sub: { id: 123 },
      },
      'session-secret',
      {
        keyid: 'uuid-1',
      },
    );
    expect(result).toEqual({
      token: 'signed-token',
      payload: {
        iat,
        exp: iat + 2 * 24 * 60 * 60,
        sub: { id: 123 },
      },
    });
  });

  test('uses current date when issuedAt is omitted', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-11-14T22:13:20.000Z'));

    createJwtTokenHelper.fn({
      subject: 'user-1',
    });

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        iat: 1700000000,
        exp: 1700172800,
        sub: 'user-1',
      }),
      'session-secret',
      expect.any(Object),
    );

    jest.useRealTimers();
  });
});
