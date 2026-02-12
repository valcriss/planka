const originalFetch = global.fetch;
const originalSails = global.sails;

const makeResponse = ({ ok = true, url, bodyChunks = [], status = 200 }) => ({
  ok,
  status,
  url,
  body: {
    getReader: () => {
      let index = 0;
      return {
        read: async () => {
          if (index < bodyChunks.length) {
            const value = bodyChunks[index];
            index += 1;
            return { value, done: false };
          }
          return { value: undefined, done: true };
        },
        cancel: jest.fn(),
      };
    },
  },
});

describe('utils/download-favicon helper', () => {
  let fileManager;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    global.fetch = jest.fn();

    fileManager = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    global.sails = {
      config: {
        custom: {
          faviconsPathSegment: 'favicons',
        },
      },
      hooks: {
        'file-manager': {
          getInstance: () => fileManager,
        },
      },
    };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
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

  test('downloads linked favicon and saves resized png', async () => {
    const metadata = jest.fn().mockResolvedValue({
      format: 'png',
      width: 64,
      height: 64,
    });
    const toBuffer = jest.fn().mockResolvedValue(Buffer.from('png'));
    const image = {
      metadata,
      resize: jest.fn(() => image),
      png: jest.fn(() => image),
      toBuffer,
    };
    const mockSharp = jest.fn(() => image);
    mockSharp.kernel = { nearest: 'nearest' };

    const mockIcoToPng = jest.fn();

    jest.doMock('sharp', () => mockSharp);
    jest.doMock('ico-to-png', () => mockIcoToPng);

    // eslint-disable-next-line global-require
    const helper = require('../api/helpers/utils/download-favicon');

    global.fetch
      .mockResolvedValueOnce(
        makeResponse({
          url: 'http://example.com',
          bodyChunks: [
            Buffer.from(
              '<html><link rel="icon" sizes="16x16" href="/tiny.png"><link rel="icon" sizes="64x64" href="/icon.png"></html>',
            ),
          ],
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          url: 'http://example.com/icon.png',
          bodyChunks: [Buffer.from('icondata')],
        }),
      );

    await helper.fn({ url: 'http://example.com/path' });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[0][0]).toBe('http://example.com');
    expect(global.fetch.mock.calls[1][0]).toBe('http://example.com/icon.png');
    expect(mockIcoToPng).not.toHaveBeenCalled();
    expect(fileManager.save).toHaveBeenCalledWith(
      'favicons/example.com.png',
      Buffer.from('png'),
      'image/png',
    );
  });

  test('falls back to /favicon.ico when no link tag exists', async () => {
    const metadata = jest.fn().mockResolvedValue({
      format: 'png',
      width: 32,
      height: 32,
    });
    const image = {
      metadata,
      resize: jest.fn(() => image),
      png: jest.fn(() => image),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('png')),
    };
    const mockSharp = jest.fn(() => image);
    mockSharp.kernel = { nearest: 'nearest' };

    jest.doMock('sharp', () => mockSharp);
    jest.doMock('ico-to-png', () => jest.fn());

    // eslint-disable-next-line global-require
    const helper = require('../api/helpers/utils/download-favicon');

    global.fetch
      .mockResolvedValueOnce(
        makeResponse({
          url: 'http://example.com',
          bodyChunks: [Buffer.from('<html></html>')],
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          url: 'http://example.com/favicon.ico',
          bodyChunks: [Buffer.from('icondata')],
        }),
      );

    await helper.fn({ url: 'http://example.com/path' });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][0]).toBe('http://example.com/favicon.ico');
    expect(fileManager.save).toHaveBeenCalledWith(
      'favicons/example.com.png',
      Buffer.from('png'),
      'image/png',
    );
  });

  test('converts magick metadata via ico-to-png before saving', async () => {
    const metadata = jest
      .fn()
      .mockResolvedValueOnce({ format: 'magick' })
      .mockResolvedValueOnce({ format: 'png', width: 32, height: 32 });
    const image = {
      metadata,
      resize: jest.fn(() => image),
      png: jest.fn(() => image),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('png')),
    };
    const mockSharp = jest.fn(() => image);
    mockSharp.kernel = { nearest: 'nearest' };

    const mockIcoToPng = jest.fn().mockResolvedValue(Buffer.from('ico'));

    jest.doMock('sharp', () => mockSharp);
    jest.doMock('ico-to-png', () => mockIcoToPng);

    // eslint-disable-next-line global-require
    const helper = require('../api/helpers/utils/download-favicon');

    global.fetch
      .mockResolvedValueOnce(
        makeResponse({
          url: 'http://example.com',
          bodyChunks: [
            Buffer.from('<html><link rel="icon" sizes="32x32" href="/icon.ico"></html>'),
          ],
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          url: 'http://example.com/icon.ico',
          bodyChunks: [Buffer.from('icodata')],
        }),
      );

    await helper.fn({ url: 'http://example.com/path' });

    expect(mockIcoToPng).toHaveBeenCalledWith(Buffer.from('icodata'), 32);
    expect(fileManager.save).toHaveBeenCalledWith(
      'favicons/example.com.png',
      Buffer.from('png'),
      'image/png',
    );
  });
});
