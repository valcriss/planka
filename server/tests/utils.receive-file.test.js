const originalSails = global.sails;

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-file-name'),
}));

const receiveFileHelper = require('../api/helpers/utils/receive-file');

describe('utils/receive-file helper', () => {
  beforeEach(() => {
    global.sails = {
      config: {
        custom: {
          uploadsTempPath: '/tmp/uploads',
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

  test('uploads the request file and returns success exit result', async () => {
    const uploadedFiles = [{ fd: '/tmp/uploads/uuid-file-name', filename: 'file.png' }];
    const upload = jest.fn((options, cb) => cb(null, uploadedFiles));
    const req = {
      file: jest.fn(() => ({
        upload,
      })),
    };
    const exits = {
      success: jest.fn((files) => files),
    };

    const result = await receiveFileHelper.fn(
      {
        paramName: 'avatar',
        req,
      },
      exits,
    );

    expect(req.file).toHaveBeenCalledWith('avatar');
    expect(upload).toHaveBeenCalledWith(
      {
        dirname: '/tmp/uploads',
        saveAs: 'uuid-file-name',
        maxBytes: null,
      },
      expect.any(Function),
    );
    expect(exits.success).toHaveBeenCalledWith(uploadedFiles);
    expect(result).toEqual(uploadedFiles);
  });
});
