const downloadController = require('../api/controllers/file-attachments/download');
const downloadThumbnailController = require('../api/controllers/file-attachments/download-thumbnail');

const originalSails = global.sails;
const originalAttachment = global.Attachment;
const originalBoardMembership = global.BoardMembership;
const originalUser = global.User;

const makeInterceptable = (value, codeToThrow) => ({
  intercept(code, handler) {
    if (code === codeToThrow) {
      throw handler();
    }

    return value;
  },
});

describe('file-attachments controllers', () => {
  beforeEach(() => {
    global.sails = {
      config: {
        custom: {
          attachmentsPathSegment: 'attachments',
        },
      },
      hooks: {
        'file-manager': {
          getInstance: jest.fn(),
        },
      },
      helpers: {
        attachments: {
          getPathToProjectById: jest.fn(),
        },
        users: {
          isProjectManager: jest.fn(),
        },
      },
    };

    global.Attachment = {
      Types: {
        FILE: 'file',
      },
    };

    global.User = {
      Roles: {
        ADMIN: 'admin',
        MEMBER: 'member',
      },
    };

    global.BoardMembership = {
      qm: {
        getOneByBoardIdAndUserId: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.Attachment = originalAttachment;
    global.BoardMembership = originalBoardMembership;
    global.User = originalUser;
  });

  test('file-attachments/download handles path, type, and permissions', async () => {
    sails.helpers.attachments.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(
      downloadController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } }, res: {} },
        { id: 'a1' },
        { success: jest.fn() },
      ),
    ).rejects.toEqual({
      fileAttachmentNotFound: 'File attachment not found',
    });

    sails.helpers.attachments.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        attachment: { id: 'a1', type: 'link' },
      }),
    );
    await expect(
      downloadController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } }, res: {} },
        { id: 'a1' },
        { success: jest.fn() },
      ),
    ).rejects.toEqual({
      fileAttachmentNotFound: 'File attachment not found',
    });

    sails.helpers.attachments.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        attachment: {
          id: 'a1',
          type: 'file',
          data: { fileReferenceId: 'ref1', filename: 'file.txt', mimeType: 'text/plain' },
        },
        board: { id: 'b1' },
        project: { id: 'p1', ownerProjectManagerId: null },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);

    await expect(
      downloadController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } }, res: {} },
        { id: 'a1' },
        { success: jest.fn() },
      ),
    ).rejects.toEqual({
      fileAttachmentNotFound: 'File attachment not found',
    });
  });

  test('file-attachments/download rejects when storage read fails', async () => {
    const fileManager = { read: jest.fn(() => Promise.reject(new Error('missing'))) };
    sails.hooks['file-manager'].getInstance.mockReturnValue(fileManager);

    sails.helpers.attachments.getPathToProjectById.mockReturnValue(
      makeInterceptable({
        attachment: {
          id: 'a1',
          type: 'file',
          data: { fileReferenceId: 'ref1', filename: 'file.txt', mimeType: 'text/plain' },
        },
        board: { id: 'b1' },
        project: { id: 'p1', ownerProjectManagerId: null },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);

    await expect(
      downloadController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } }, res: {} },
        { id: 'a1' },
        { success: jest.fn() },
      ),
    ).rejects.toEqual({
      fileAttachmentNotFound: 'File attachment not found',
    });
  });

  test('file-attachments/download returns stream with headers', async () => {
    const fileManager = { read: jest.fn(() => Promise.resolve('stream')) };
    const res = { type: jest.fn(), set: jest.fn() };

    sails.hooks['file-manager'].getInstance.mockReturnValue(fileManager);
    sails.helpers.attachments.getPathToProjectById.mockReturnValue(
      makeInterceptable({
        attachment: {
          id: 'a1',
          type: 'file',
          data: {
            fileReferenceId: 'ref1',
            filename: 'file.bin',
            mimeType: 'application/octet-stream',
            image: null,
          },
        },
        board: { id: 'b1' },
        project: { id: 'p1', ownerProjectManagerId: null },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);

    const exits = { success: jest.fn() };
    await downloadController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'member' } }, res },
      { id: 'a1' },
      exits,
    );

    expect(res.type).toHaveBeenCalledWith('application/octet-stream');
    expect(res.set).toHaveBeenCalledWith('Content-Disposition', 'attachment');
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, max-age=900');
    expect(exits.success).toHaveBeenCalledWith('stream');
  });

  test('file-attachments/download-thumbnail validates inputs and permissions', async () => {
    sails.helpers.attachments.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        attachment: { id: 'a1', type: 'link', data: {} },
      }),
    );
    await expect(
      downloadThumbnailController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } }, res: {} },
        { id: 'a1', fileName: 'outside-360', fileExtension: 'png' },
        { success: jest.fn() },
      ),
    ).rejects.toEqual({
      fileAttachmentNotFound: 'File attachment not found',
    });

    sails.helpers.attachments.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        attachment: { id: 'a1', type: 'file', data: { image: null } },
      }),
    );
    await expect(
      downloadThumbnailController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } }, res: {} },
        { id: 'a1', fileName: 'outside-360', fileExtension: 'png' },
        { success: jest.fn() },
      ),
    ).rejects.toEqual({
      fileAttachmentNotFound: 'File attachment not found',
    });

    sails.helpers.attachments.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        attachment: {
          id: 'a1',
          type: 'file',
          data: { image: { thumbnailsExtension: 'jpg' } },
        },
      }),
    );
    await expect(
      downloadThumbnailController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } }, res: {} },
        { id: 'a1', fileName: 'outside-360', fileExtension: 'png' },
        { success: jest.fn() },
      ),
    ).rejects.toEqual({
      fileAttachmentNotFound: 'File attachment not found',
    });

    sails.helpers.attachments.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        attachment: {
          id: 'a1',
          type: 'file',
          data: {
            fileReferenceId: 'ref1',
            image: { thumbnailsExtension: 'png' },
            mimeType: 'image/png',
          },
        },
        board: { id: 'b1' },
        project: { id: 'p1', ownerProjectManagerId: 'pm1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);

    await expect(
      downloadThumbnailController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'admin' } }, res: {} },
        { id: 'a1', fileName: 'outside-360', fileExtension: 'png' },
        { success: jest.fn() },
      ),
    ).rejects.toEqual({
      fileAttachmentNotFound: 'File attachment not found',
    });
  });

  test('file-attachments/download-thumbnail returns stream with headers', async () => {
    const fileManager = { read: jest.fn(() => Promise.resolve('thumb-stream')) };
    const res = { type: jest.fn(), set: jest.fn() };

    sails.hooks['file-manager'].getInstance.mockReturnValue(fileManager);
    sails.helpers.attachments.getPathToProjectById.mockReturnValue(
      makeInterceptable({
        attachment: {
          id: 'a1',
          type: 'file',
          data: {
            fileReferenceId: 'ref1',
            image: { thumbnailsExtension: 'png' },
            mimeType: 'image/png',
          },
        },
        board: { id: 'b1' },
        project: { id: 'p1', ownerProjectManagerId: null },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);

    const exits = { success: jest.fn() };
    await downloadThumbnailController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'member' } }, res },
      { id: 'a1', fileName: 'outside-360', fileExtension: 'png' },
      exits,
    );

    expect(res.type).toHaveBeenCalledWith('image/png');
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, max-age=900');
    expect(exits.success).toHaveBeenCalledWith('thumb-stream');
  });
});
