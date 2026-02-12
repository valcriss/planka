const path = require('path');

const mockExecFile = jest.fn();
const mockPromisify = jest.fn(() => mockExecFile);

jest.mock('child_process', () => ({
  execFile: mockExecFile,
}));

jest.mock('util', () => ({
  promisify: mockPromisify,
}));

const sendNotifications = require('../api/helpers/utils/send-notifications');

const originalSails = global.sails;

describe('utils/send-notifications helper', () => {
  beforeEach(() => {
    mockExecFile.mockReset();

    global.sails = {
      config: {
        appPath: 'C:\\app',
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

  test('builds python command and args', async () => {
    const inputs = {
      services: { slack: { enabled: true } },
      title: 'Build done',
      bodyByFormat: { text: 'OK' },
    };

    mockExecFile.mockResolvedValue({ stdout: 'ok', stderr: '' });

    await sendNotifications.fn(inputs);

    const expectedPythonPath =
      process.platform === 'win32'
        ? path.join('C:\\app', '.venv', 'Scripts', 'python.exe')
        : path.join('C:\\app', '.venv', 'bin', 'python3');

    expect(mockPromisify).toHaveBeenCalledWith(mockExecFile);
    expect(mockExecFile).toHaveBeenCalledWith(expectedPythonPath, [
      'C:\\app/utils/send_notifications.py',
      JSON.stringify(inputs.services),
      inputs.title,
      JSON.stringify(inputs.bodyByFormat),
    ]);
  });
});
