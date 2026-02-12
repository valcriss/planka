describe('logger utils', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('builds logger with default env values', () => {
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_FILE;

    const createLogger = jest.fn(() => ({ id: 'logger' }));
    const fileTransport = jest.fn((options) => ({ type: 'file', options }));
    const consoleTransport = jest.fn((options) => ({ type: 'console', options }));
    const combine = jest.fn(() => 'combined-format');
    const uncolorize = jest.fn(() => 'uncolorize');
    const timestamp = jest.fn(() => 'timestamp');
    const printf = jest.fn(() => 'printf');

    jest.doMock('winston', () => ({
      createLogger,
      transports: {
        File: fileTransport,
        Console: consoleTransport,
      },
      format: {
        combine,
        uncolorize,
        timestamp,
        printf,
      },
    }));

    // eslint-disable-next-line global-require
    const { customLogger } = require('../utils/logger');

    expect(customLogger).toEqual({ id: 'logger' });
    expect(timestamp).toHaveBeenCalledWith({ format: 'YYYY-MM-DD HH:mm:ss' });
    expect(printf).toHaveBeenCalledWith(expect.any(Function));
    const formatter = printf.mock.calls[0][0];
    expect(
      formatter({
        timestamp: '2026-01-01 12:00:00',
        level: 'info',
        message: 'hello',
      }),
    ).toBe('2026-01-01 12:00:00 [I] hello');
    expect(combine).toHaveBeenCalled();
    expect(fileTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        format: 'combined-format',
      }),
    );
    expect(consoleTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        format: 'combined-format',
      }),
    );
  });

  test('builds logger with LOG_LEVEL and LOG_FILE from env', () => {
    process.env.LOG_LEVEL = 'error';
    process.env.LOG_FILE = '/tmp/planka.log';

    const createLogger = jest.fn(() => ({ id: 'logger' }));
    const fileTransport = jest.fn((options) => ({ type: 'file', options }));
    const consoleTransport = jest.fn((options) => ({ type: 'console', options }));

    jest.doMock('winston', () => ({
      createLogger,
      transports: {
        File: fileTransport,
        Console: consoleTransport,
      },
      format: {
        combine: jest.fn(() => 'combined-format'),
        uncolorize: jest.fn(() => 'uncolorize'),
        timestamp: jest.fn(() => 'timestamp'),
        printf: jest.fn(() => 'printf'),
      },
    }));

    // eslint-disable-next-line global-require
    require('../utils/logger');

    expect(fileTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        filename: '/tmp/planka.log',
      }),
    );
    expect(consoleTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
      }),
    );
  });
});
