const lodash = require('lodash');

jest.mock('mime', () => ({
  getType: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-1'),
}));

jest.mock('rimraf', () => ({
  rimraf: jest.fn().mockResolvedValue(),
}));

jest.mock('sharp', () => jest.fn());

const mime = require('mime');
const { rimraf } = require('rimraf');
const sharp = require('sharp');

const processUploadedFile = require('../api/helpers/background-images/process-uploaded-file');

const originalSails = global.sails;
const originalLodash = global._;

describe('helpers/background-images/process-uploaded-file', () => {
  beforeEach(() => {
    global._ = lodash;

    const sharpMetadata = jest.fn();
    const sharpToBuffer = jest.fn();
    const sharpRotate = jest.fn();
    const sharpResize = jest.fn();
    const sharpPng = jest.fn();

    const sharpInstance = {
      metadata: sharpMetadata,
      toBuffer: sharpToBuffer,
      rotate: sharpRotate,
      resize: sharpResize,
      png: sharpPng,
    };

    sharpRotate.mockReturnValue(sharpInstance);
    sharpResize.mockReturnValue(sharpInstance);
    sharpPng.mockReturnValue(sharpInstance);

    sharp.mockReset();
    sharp.mockImplementation(() => sharpInstance);
    sharp.instance = sharpInstance;
    sharp.metadataMock = sharpMetadata;
    sharp.toBufferMock = sharpToBuffer;

    rimraf.mockClear();
    mime.getType.mockReset();

    global.sails = {
      config: {
        custom: {
          backgroundImagesPathSegment: 'backgrounds',
        },
      },
      hooks: {
        'file-manager': {
          getInstance: jest.fn().mockReturnValue({
            save: jest.fn().mockResolvedValue(),
            deleteDir: jest.fn().mockResolvedValue(),
          }),
        },
      },
      log: {
        warn: jest.fn(),
      },
    };
  });

  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }

    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });

  test('rejects non-image mime types', async () => {
    mime.getType.mockReturnValue('application/pdf');

    await expect(
      processUploadedFile.fn({
        file: {
          filename: 'file.pdf',
          fd: '/tmp/file.pdf',
          type: 'application/pdf',
        },
      }),
    ).rejects.toBe('fileIsNotImage');

    expect(rimraf).toHaveBeenCalledWith('/tmp/file.pdf');
    expect(sharp).not.toHaveBeenCalled();
  });

  test('rejects when image metadata cannot be read', async () => {
    mime.getType.mockReturnValue('image/png');
    sharp.metadataMock.mockRejectedValue(new Error('bad image'));

    await expect(
      processUploadedFile.fn({
        file: { filename: 'file.png', fd: '/tmp/file.png', type: 'image/png' },
      }),
    ).rejects.toBe('fileIsNotImage');

    expect(rimraf).toHaveBeenCalledWith('/tmp/file.png');
  });

  test('stores resized images and returns metadata', async () => {
    mime.getType.mockReturnValue('image/jpeg');
    sharp.metadataMock.mockResolvedValue({
      format: 'jpeg',
      orientation: 6,
    });
    sharp.toBufferMock
      .mockResolvedValueOnce(Buffer.from('original'))
      .mockResolvedValueOnce(Buffer.from('outside-360'));

    const fileManager = sails.hooks['file-manager'].getInstance();

    const result = await processUploadedFile.fn({
      file: { filename: 'file.jpg', fd: '/tmp/file.jpg', type: 'image/jpeg' },
    });

    expect(result).toEqual({
      dirname: 'uuid-1',
      extension: 'jpg',
      sizeInBytes: Buffer.from('original').length,
    });
    expect(fileManager.save).toHaveBeenCalledWith(
      'backgrounds/uuid-1/original.jpg',
      Buffer.from('original'),
      'image/jpeg',
    );
    expect(fileManager.save).toHaveBeenCalledWith(
      'backgrounds/uuid-1/outside-360.jpg',
      Buffer.from('outside-360'),
      'image/jpeg',
    );
    expect(rimraf).toHaveBeenCalledWith('/tmp/file.jpg');
  });
});
