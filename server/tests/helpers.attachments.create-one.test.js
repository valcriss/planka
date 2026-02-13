const createAttachment = require('../api/helpers/attachments/create-one');

const originalSails = global.sails;
const originalAttachment = global.Attachment;
const originalWebhook = global.Webhook;

describe('helpers/attachments/create-one', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        attachments: {
          presentOne: jest.fn((attachment) => ({ id: attachment.id })),
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
        createOne: jest.fn(),
      },
    };

    global.Webhook = {
      Events: {
        ATTACHMENT_CREATE: 'attachmentCreate',
      },
      qm: {
        getAll: jest.fn(),
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
  });

  test('creates attachment and sets card cover for image files', async () => {
    const attachment = {
      id: 'att-1',
      type: Attachment.Types.FILE,
      data: { image: true },
    };

    Attachment.qm.createOne.mockResolvedValue(attachment);
    Webhook.qm.getAll.mockResolvedValue([{ id: 'wh-1' }]);

    const inputs = {
      values: {
        card: { id: 'card-1', boardId: 'board-1', coverAttachmentId: null },
        creatorUser: { id: 'user-1' },
      },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      requestId: 'req-1',
      request: { id: 'req-1' },
    };

    const result = await createAttachment.fn(inputs);

    expect(result).toBe(attachment);
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'board:board-1',
      'attachmentCreate',
      { item: { id: 'att-1' }, requestId: 'req-1' },
      inputs.request,
    );
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalledTimes(1);
    expect(sails.helpers.cards.updateOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: { coverAttachmentId: 'att-1' },
      }),
    );
  });

  test('does not update cover when card already has one', async () => {
    const attachment = {
      id: 'att-2',
      type: Attachment.Types.FILE,
      data: { image: true },
    };

    Attachment.qm.createOne.mockResolvedValue(attachment);
    Webhook.qm.getAll.mockResolvedValue([]);

    const inputs = {
      values: {
        card: { id: 'card-2', boardId: 'board-2', coverAttachmentId: 'att-0' },
        creatorUser: { id: 'user-2' },
      },
      project: { id: 'project-2' },
      board: { id: 'board-2' },
      list: { id: 'list-2' },
    };

    await createAttachment.fn(inputs);

    expect(sails.helpers.cards.updateOne.with).not.toHaveBeenCalled();
  });
});
