import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

import { getAccessToken, removeAccessToken, setAccessToken } from '../src/utils/access-token-storage';

jest.mock('js-cookie', () => ({
  __esModule: true,
  default: {
    set: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(),
}));

jest.mock('../src/constants/Config', () => ({
  __esModule: true,
  default: {
    ACCESS_TOKEN_KEY: 'accessToken',
    ACCESS_TOKEN_VERSION_KEY: 'accessTokenVersion',
    ACCESS_TOKEN_VERSION: '1',
  },
}));

describe('access-token-storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.window = { location: { protocol: 'https:' } };
  });

  test('setAccessToken stores token and version cookies with expiration and secure flags', () => {
    jwtDecode.mockReturnValue({ exp: 1700000000 });

    setAccessToken('token-value');

    expect(Cookies.set).toHaveBeenCalledWith(
      'accessToken',
      'token-value',
      expect.objectContaining({
        expires: new Date(1700000000 * 1000),
        secure: true,
        sameSite: 'strict',
      }),
    );
    expect(Cookies.set).toHaveBeenCalledWith('accessTokenVersion', '1', {
      expires: new Date(1700000000 * 1000),
    });
  });

  test('removeAccessToken clears both cookies', () => {
    removeAccessToken();

    expect(Cookies.remove).toHaveBeenCalledWith('accessToken');
    expect(Cookies.remove).toHaveBeenCalledWith('accessTokenVersion');
  });

  test('getAccessToken returns token when version is valid', () => {
    Cookies.get.mockImplementation((key) => {
      if (key === 'accessToken') {
        return 'abc';
      }

      return '1';
    });

    expect(getAccessToken()).toBe('abc');
    expect(Cookies.remove).not.toHaveBeenCalled();
  });

  test('getAccessToken removes token and returns undefined when version mismatches', () => {
    Cookies.get.mockImplementation((key) => {
      if (key === 'accessToken') {
        return 'abc';
      }

      return '2';
    });

    expect(getAccessToken()).toBeUndefined();
    expect(Cookies.remove).toHaveBeenCalledWith('accessToken');
    expect(Cookies.remove).toHaveBeenCalledWith('accessTokenVersion');
  });
});
