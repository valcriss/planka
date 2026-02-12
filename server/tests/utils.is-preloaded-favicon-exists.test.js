const path = require('path');

describe('utils/is-preloaded-favicon-exists helper', () => {
  const originalSails = global.sails;

  beforeEach(() => {
    jest.resetModules();
    global.sails = {
      config: {
        custom: {
          uploadsBasePath: '/uploads',
          preloadedFaviconsPathSegment: 'favicons',
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

  test('returns true only for hostnames backed by png preload files', () => {
    jest.doMock('fs', () => ({
      readdirSync: jest.fn(() => ['github.com.png', 'example.org.png', 'README.txt']),
    }));

    // eslint-disable-next-line global-require
    const helper = require('../api/helpers/utils/is-preloaded-favicon-exists');

    expect(helper.fn({ hostname: 'github.com' })).toBe(true);
    expect(helper.fn({ hostname: 'example.org' })).toBe(true);
    expect(helper.fn({ hostname: 'README' })).toBe(false);
    expect(helper.fn({ hostname: 'unknown.com' })).toBe(false);
  });

  test('reads preloaded favicon directory at module initialization', () => {
    const readdirSync = jest.fn(() => []);
    jest.doMock('fs', () => ({
      readdirSync,
    }));

    // eslint-disable-next-line global-require
    require('../api/helpers/utils/is-preloaded-favicon-exists');

    expect(readdirSync).toHaveBeenCalledWith(path.join('/uploads', 'favicons'));
  });
});
