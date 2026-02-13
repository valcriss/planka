const lodash = require('lodash');
const updateAttachment = require('../api/helpers/attachments/update-one');
const deleteAttachment = require('../api/helpers/attachments/delete-one');
const processLink = require('../api/helpers/attachments/process-link');

const originalSails = global.sails;
const originalAttachment = global.Attachment;
const originalWebhook = global.Webhook;
const originalLodash = global._;
describe('helpers/attachments lifecycle', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      helpers: {
        attachments: {
          presentOne: jest.fn((value) => value),
          removeUnreferencedFiles: jest.fn(),
        },
        cards: {
          updateOne: {
            with: jest.fn(),
          },
        },
        utils: {
          sendWebhooks: {
            with: jest.fn(),
          },
          isPreloadedFaviconExists: jest.fn().mockReturnValue(true),
          downloadFavicon: jest.fn(),
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };
    global.Attachment = {
      Types: {
        FILE: 'file',
      },
      qm: {
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
    global.Webhook = {
      Events: {
        ATTACHMENT_UPDATE: 'attachmentUpdate',
        ATTACHMENT_DELETE: 'attachmentDelete',
      },
      qm: {
        getAll: jest.fn().mockResolvedValue([{ id: 'wh-1' }]),
      },
    };
  });
  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }
    if (typeof originalAttachment === 'undefined') {
      delete global.Attachment;
    } else {
      global.Attachment = originalAttachment;
    }
    if (typeof originalWebhook === 'undefined') {
      delete global.Webhook;
    } else {
      global.Webhook = originalWebhook;
    }
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('updates attachment and sends webhooks', async () => {
    Attachment.qm.updateOne.mockResolvedValue({ id: 'att-1' });
    const result = await updateAttachment.fn({
      record: { id: 'att-1' },
      values: { name: 'Updated' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });
    expect(result).toEqual({ id: 'att-1' });
    expect(sails.sockets.broadcast).toHaveBeenCalled();
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('skips webhooks when attachment update returns null', async () => {
    Attachment.qm.updateOne.mockResolvedValue(null);
    const result = await updateAttachment.fn({
      record: { id: 'att-2' },
      values: { name: 'No update' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-2' },
    });
    expect(result).toBeNull();
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });
  test('deletes attachment, clears cover, and sends webhooks', async () => {
    Attachment.qm.deleteOne.mockResolvedValue({
      attachment: { id: 'att-3' },
      fileReference: { id: 'file-1' },
    });
    const result = await deleteAttachment.fn({
      record: { id: 'att-3', type: 'file' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1', coverAttachmentId: 'att-3' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-3' },
    });
    expect(result).toEqual({ id: 'att-3' });
    expect(sails.helpers.cards.updateOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        record: { id: 'card-1', coverAttachmentId: 'att-3' },
        values: { coverAttachmentId: null },
      }),
    );
    expect(sails.helpers.attachments.removeUnreferencedFiles).toHaveBeenCalledWith({
      id: 'file-1',
    });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('processes link without downloading when favicon exists', async () => {
    sails.helpers.utils.isPreloadedFaviconExists.mockReturnValue(true);
    const result = await processLink.fn({
      url: 'https://example.com/path',
    });
    expect(result).toEqual({
      hostname: 'example.com',
      url: 'https://example.com/path',
    });
    expect(sails.helpers.utils.downloadFavicon).not.toHaveBeenCalled();
  });
  test('downloads favicon when not cached', async () => {
    sails.helpers.utils.isPreloadedFaviconExists.mockReturnValue(false);
    await processLink.fn({
      url: 'https://example.com/path',
    });
    expect(sails.helpers.utils.downloadFavicon).toHaveBeenCalledWith('https://example.com/path');
  });
});
