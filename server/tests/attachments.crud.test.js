const _ = require('lodash');

const original = {
  _: global._,
  Attachment: global.Attachment,
  BoardMembership: global.BoardMembership,
  sails: global.sails,
};

const ensureGlobals = () => {
  global._ = _;
  global.Attachment = global.Attachment || { Types: { FILE: 'file', LINK: 'link' } };
  global.BoardMembership = global.BoardMembership || {
    Roles: { EDITOR: 'editor', VIEWER: 'viewer' },
    qm: { getOneByBoardIdAndUserId: jest.fn() },
  };
  global.sails = global.sails || { helpers: {} };
  global.sails.helpers = global.sails.helpers || {};
  global.sails.helpers.utils = global.sails.helpers.utils || {};
  global.sails.helpers.attachments = global.sails.helpers.attachments || {};
  global.sails.helpers.cards = global.sails.helpers.cards || {};
};

const setHelper = (pathArr, fn) => {
  let cursor = global.sails.helpers;
  for (let i = 0; i < pathArr.length - 1; i += 1) {
    const seg = pathArr[i];
    cursor[seg] = cursor[seg] || {};
    cursor = cursor[seg];
  }
  cursor[pathArr[pathArr.length - 1]] = fn;
};

const makeCtx = (user = {}) => ({
  req: {
    currentUser: { id: 'u1', role: 'member', language: 'en', ...user },
    getLocale: jest.fn().mockReturnValue('en'),
  },
});

// Ensure Attachment global exists before requiring controllers (controllers reference Attachment.Types at module load)
global.Attachment = global.Attachment || { Types: { FILE: 'file', LINK: 'link' } };
const createController = require('../api/controllers/attachments/create');
const updateController = require('../api/controllers/attachments/update');
const deleteController = require('../api/controllers/attachments/delete');

describe('attachments CRUD controllers', () => {
  beforeEach(() => {
    ensureGlobals();
    // Reset membership mock
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockReset();

    // Mock translator dependent helpers (only receiveFile used from utils + attachments processing helpers)
    global.sails.helpers.utils.receiveFile = jest.fn();
    global.sails.helpers.attachments.processUploadedFile = jest.fn();
    global.sails.helpers.attachments.processLink = jest.fn();
    global.sails.helpers.attachments.createOne = { with: jest.fn() };
    global.sails.helpers.attachments.updateOne = { with: jest.fn() };
    global.sails.helpers.attachments.deleteOne = { with: jest.fn() };
    global.sails.helpers.attachments.presentOne = (x) => x;

    // Default path helper returns chain supporting intercept
    setHelper(['cards', 'getPathToProjectById'], (cardId) => ({
      intercept: () => ({
        card: { id: cardId },
        list: { id: 'list1' },
        board: { id: 'board1' },
        project: { id: 'proj1' },
      }),
    }));
    setHelper(['attachments', 'getPathToProjectById'], (id) => ({
      intercept: () => ({
        attachment: { id, name: 'Old', data: {} },
        card: { id: 'card1' },
        list: { id: 'list1' },
        board: { id: 'board1' },
        project: { id: 'proj1' },
      }),
    }));
  });

  afterAll(() => {
    if (typeof original._ === 'undefined') {
      delete global._;
    } else {
      global._ = original._;
    }
    if (typeof original.Attachment === 'undefined') {
      delete global.Attachment;
    } else {
      global.Attachment = original.Attachment;
    }
    if (typeof original.BoardMembership === 'undefined') {
      delete global.BoardMembership;
    } else {
      global.BoardMembership = original.BoardMembership;
    }
    if (typeof original.sails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = original.sails;
    }
  });

  const exits = {
    success: (v) => v,
    uploadError: (msg) => ({ uploadError: msg }),
  };

  test('create attachment (link) success', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm1',
      role: 'editor',
    });
    global.sails.helpers.attachments.processLink.mockResolvedValue({ url: 'http://x' });
    global.sails.helpers.attachments.createOne.with.mockResolvedValue({
      id: 'a1',
      type: 'link',
      name: 'Doc',
    });

    const ctx = makeCtx();
    const result = await createController.fn.call(
      ctx,
      {
        cardId: 'card1',
        type: 'link',
        url: 'http://x',
        name: 'Doc',
      },
      exits,
    );

    expect(result.item).toEqual({ id: 'a1', type: 'link', name: 'Doc' });
    expect(global.sails.helpers.attachments.processLink).toHaveBeenCalled();
  });

  test('create attachment link missing url -> urlMustBePresent error', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm1',
      role: 'editor',
    });
    const ctx = makeCtx();
    await expect(
      createController.fn.call(
        ctx,
        {
          cardId: 'card1',
          type: 'link',
          name: 'Doc',
        },
        exits,
      ),
    ).rejects.toMatchObject({ urlMustBePresent: 'Url must be present' });
  });

  test('create attachment file success', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm1',
      role: 'editor',
    });
    global.sails.helpers.utils.receiveFile.mockResolvedValue([{ path: 'f1' }]);
    global.sails.helpers.attachments.processUploadedFile.mockResolvedValue({
      path: 'f1',
      size: 10,
    });
    global.sails.helpers.attachments.createOne.with.mockResolvedValue({
      id: 'a2',
      type: 'file',
      name: 'F',
    });
    const ctx = makeCtx();
    const result = await createController.fn.call(
      ctx,
      {
        cardId: 'card1',
        type: 'file',
        name: 'F',
      },
      exits,
    );
    expect(result.item).toEqual({ id: 'a2', type: 'file', name: 'F' });
    expect(global.sails.helpers.utils.receiveFile).toHaveBeenCalledWith('file', ctx.req);
  });

  test('create attachment file receiveFile throws -> uploadError exit', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm1',
      role: 'editor',
    });
    global.sails.helpers.utils.receiveFile.mockImplementation(() => {
      throw new Error('boom');
    });
    const ctx = makeCtx();
    const result = await createController.fn.call(
      ctx,
      {
        cardId: 'card1',
        type: 'file',
        name: 'File',
      },
      exits,
    );
    expect(result).toEqual({ uploadError: 'boom' });
  });

  test('create attachment file with no files -> noFileWasUploaded', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm1',
      role: 'editor',
    });
    global.sails.helpers.utils.receiveFile.mockResolvedValue([]);
    const ctx = makeCtx();
    await expect(
      createController.fn.call(
        ctx,
        {
          cardId: 'card1',
          type: 'file',
          name: 'F',
        },
        exits,
      ),
    ).rejects.toMatchObject({ noFileWasUploaded: 'No file was uploaded' });
  });

  test('create attachment not enough rights when membership not editor', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm1',
      role: 'viewer',
    });
    const ctx = makeCtx();
    await expect(
      createController.fn.call(
        ctx,
        {
          cardId: 'card1',
          type: 'link',
          url: 'http://x',
          name: 'N',
        },
        exits,
      ),
    ).rejects.toMatchObject({ notEnoughRights: 'Not enough rights' });
  });

  test('create attachment card not found when no membership', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);
    const ctx = makeCtx();
    await expect(
      createController.fn.call(
        ctx,
        {
          cardId: 'card1',
          type: 'link',
          url: 'http://x',
          name: 'N',
        },
        exits,
      ),
    ).rejects.toMatchObject({ cardNotFound: 'Card not found' });
  });

  test('update attachment success', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm',
      role: 'editor',
    });
    global.sails.helpers.attachments.updateOne.with.mockResolvedValue({
      id: 'att1',
      name: 'New',
      data: {},
    });
    const ctx = makeCtx();
    const result = await updateController.fn.call(ctx, { id: 'att1', name: 'New' });
    expect(result.item).toEqual({ id: 'att1', name: 'New', data: {} });
  });

  test('update attachment not enough rights', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm',
      role: 'viewer',
    });
    const ctx = makeCtx();
    await expect(updateController.fn.call(ctx, { id: 'att1', name: 'X' })).rejects.toMatchObject({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('update attachment not found when membership missing', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);
    const ctx = makeCtx();
    await expect(updateController.fn.call(ctx, { id: 'att1', name: 'X' })).rejects.toMatchObject({
      attachmentNotFound: 'Attachment not found',
    });
  });

  test('update attachment not found when updateOne returns null', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm',
      role: 'editor',
    });
    global.sails.helpers.attachments.updateOne.with.mockResolvedValue(null);
    const ctx = makeCtx();
    await expect(updateController.fn.call(ctx, { id: 'att1', name: 'X' })).rejects.toMatchObject({
      attachmentNotFound: 'Attachment not found',
    });
  });

  test('delete attachment success', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm',
      role: 'editor',
    });
    global.sails.helpers.attachments.deleteOne.with.mockResolvedValue({ id: 'att1' });
    const ctx = makeCtx();
    const result = await deleteController.fn.call(ctx, { id: 'att1' });
    expect(result.item).toEqual({ id: 'att1' });
  });

  test('delete attachment not enough rights', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm',
      role: 'viewer',
    });
    const ctx = makeCtx();
    await expect(deleteController.fn.call(ctx, { id: 'att1' })).rejects.toMatchObject({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('delete attachment not found when membership missing', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);
    const ctx = makeCtx();
    await expect(deleteController.fn.call(ctx, { id: 'att1' })).rejects.toMatchObject({
      attachmentNotFound: 'Attachment not found',
    });
  });

  test('delete attachment not found when deleteOne returns null', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm',
      role: 'editor',
    });
    global.sails.helpers.attachments.deleteOne.with.mockResolvedValue(null);
    const ctx = makeCtx();
    await expect(deleteController.fn.call(ctx, { id: 'att1' })).rejects.toMatchObject({
      attachmentNotFound: 'Attachment not found',
    });
  });
});
