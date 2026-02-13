const lodash = require('lodash');
const presentAttachment = require('../api/helpers/attachments/present-one');
const presentAttachments = require('../api/helpers/attachments/present-many');
const getPathToProject = require('../api/helpers/attachments/get-path-to-project-by-id');

const originalSails = global.sails;
const originalAttachment = global.Attachment;
const originalLodash = global._;
describe('helpers/attachments present and path', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      config: {
        custom: {
          baseUrl: 'https://app.example',
          faviconsPathSegment: 'favicons',
        },
      },
      hooks: {
        'file-manager': {
          getInstance: jest.fn().mockReturnValue({
            buildUrl: jest.fn((path) => `https://cdn.example/${path}`),
          }),
        },
      },
      helpers: {
        attachments: {
          presentOne: jest.fn(),
        },
        utils: {
          isPreloadedFaviconExists: jest.fn().mockReturnValue(true),
        },
        cards: {
          getPathToProjectById: jest.fn(),
        },
      },
    };
    global.Attachment = {
      Types: {
        FILE: 'file',
        LINK: 'link',
      },
      qm: {
        getOneById: jest.fn(),
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
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('presents file attachment with urls', () => {
    const record = {
      id: 'att-1',
      type: 'file',
      data: {
        fileReferenceId: 'ref-1',
        filename: 'file.txt',
        sizeInBytes: 10,
        image: {
          width: 10,
          height: 12,
          thumbnailsExtension: 'png',
        },
      },
    };
    const result = presentAttachment.fn({ record });
    expect(result.data).toEqual({
      sizeInBytes: 10,
      image: {
        width: 10,
        height: 12,
      },
      url: 'https://app.example/attachments/att-1/download/file.txt',
      thumbnailUrls: {
        outside360: 'https://app.example/attachments/att-1/download/thumbnails/outside-360.png',
        outside720: 'https://app.example/attachments/att-1/download/thumbnails/outside-720.png',
      },
    });
  });
  test('presents link attachment with preloaded favicon', () => {
    const record = {
      id: 'att-2',
      type: 'link',
      data: {
        hostname: 'example.com',
        url: 'https://example.com',
      },
    };
    const result = presentAttachment.fn({ record });
    expect(result.data).toEqual({
      url: 'https://example.com',
      faviconUrl: 'https://app.example/preloaded-favicons/example.com.png',
    });
  });
  test('presents link attachment with stored favicon', () => {
    sails.helpers.utils.isPreloadedFaviconExists.mockReturnValue(false);
    const record = {
      id: 'att-3',
      type: 'link',
      data: {
        hostname: 'example.org',
        url: 'https://example.org',
      },
    };
    const result = presentAttachment.fn({ record });
    expect(result.data).toEqual({
      url: 'https://example.org',
      faviconUrl: 'https://cdn.example/favicons/example.org.png',
    });
  });
  test('presents many attachments via presentOne', () => {
    sails.helpers.attachments.presentOne.mockReturnValue({ id: 'att-4' });
    const result = presentAttachments.fn({ records: [{ id: 'att-4' }] });
    expect(result).toEqual([{ id: 'att-4' }]);
    expect(sails.helpers.attachments.presentOne).toHaveBeenCalledWith({
      id: 'att-4',
    });
  });
  test('resolves attachment path to project', async () => {
    Attachment.qm.getOneById.mockResolvedValue({
      id: 'att-5',
      cardId: 'card-1',
    });
    sails.helpers.cards.getPathToProjectById.mockReturnValue({
      intercept: jest.fn().mockResolvedValue({ project: { id: 'project-1' } }),
    });
    const result = await getPathToProject.fn({ id: 'att-5' });
    expect(result).toEqual({
      attachment: { id: 'att-5', cardId: 'card-1' },
      project: { id: 'project-1' },
    });
  });
  test('throws when attachment is missing', async () => {
    Attachment.qm.getOneById.mockResolvedValue(null);
    await expect(getPathToProject.fn({ id: 'att-missing' })).rejects.toBe('pathNotFound');
  });
  test('returns pathNotFound details when card path fails', async () => {
    Attachment.qm.getOneById.mockResolvedValue({
      id: 'att-6',
      cardId: 'card-2',
    });
    sails.helpers.cards.getPathToProjectById.mockReturnValue({
      intercept: jest.fn().mockResolvedValue({
        pathNotFound: {
          card: { id: 'card-2' },
        },
      }),
    });
    const result = await getPathToProject.fn({ id: 'att-6' });
    expect(result).toEqual({
      attachment: { id: 'att-6', cardId: 'card-2' },
      pathNotFound: {
        card: { id: 'card-2' },
      },
    });
  });
});
