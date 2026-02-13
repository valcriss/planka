const lodash = require('lodash');
const presentBackgroundImage = require('../api/helpers/background-images/present-one');
const presentBackgroundImages = require('../api/helpers/background-images/present-many');
const getPathToProject = require('../api/helpers/background-images/get-path-to-project-by-id');
const removeRelatedFiles = require('../api/helpers/background-images/remove-related-files');
const deleteBackgroundImage = require('../api/helpers/background-images/delete-one');

const originalSails = global.sails;
const originalBackgroundImage = global.BackgroundImage;
const originalProject = global.Project;
const originalWebhook = global.Webhook;
const originalLodash = global._;
describe('helpers/background-images lifecycle', () => {
  beforeEach(() => {
    global._ = lodash;
    const fileManager = {
      buildUrl: jest.fn((path) => `https://cdn.example/${path}`),
      deleteDir: jest.fn().mockResolvedValue(),
    };
    global.sails = {
      config: {
        custom: {
          backgroundImagesPathSegment: 'backgrounds',
        },
      },
      hooks: {
        'file-manager': {
          getInstance: jest.fn().mockReturnValue(fileManager),
        },
      },
      helpers: {
        backgroundImages: {
          presentOne: jest.fn((value) => value),
          removeRelatedFiles: jest.fn(),
        },
        projects: {
          makeScoper: {
            with: jest.fn(),
          },
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
    global.BackgroundImage = {
      qm: {
        deleteOne: jest.fn(),
        getOneById: jest.fn(),
      },
    };
    global.Project = {
      BackgroundTypes: {
        IMAGE: 'image',
      },
      qm: {
        getOneById: jest.fn(),
      },
    };
    global.Webhook = {
      Events: {
        BACKGROUND_IMAGE_DELETE: 'backgroundImageDelete',
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
    if (typeof originalBackgroundImage === 'undefined') {
      delete global.BackgroundImage;
    } else {
      global.BackgroundImage = originalBackgroundImage;
    }
    if (typeof originalProject === 'undefined') {
      delete global.Project;
    } else {
      global.Project = originalProject;
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
  test('presents single background image with urls', () => {
    const result = presentBackgroundImage.fn({
      record: {
        id: 'bg-1',
        dirname: 'dir-1',
        extension: 'png',
        sizeInBytes: 12,
      },
    });
    expect(result).toEqual({
      id: 'bg-1',
      sizeInBytes: 12,
      url: 'https://cdn.example/backgrounds/dir-1/original.png',
      thumbnailUrls: {
        outside360: 'https://cdn.example/backgrounds/dir-1/outside-360.png',
      },
    });
  });
  test('presents multiple background images', () => {
    sails.helpers.backgroundImages.presentOne.mockImplementation((value) => ({
      id: value.id,
    }));
    const result = presentBackgroundImages.fn({
      records: [{ id: 'bg-1' }, { id: 'bg-2' }],
    });
    expect(result).toEqual([{ id: 'bg-1' }, { id: 'bg-2' }]);
    expect(sails.helpers.backgroundImages.presentOne).toHaveBeenCalledTimes(2);
  });
  test('resolves background image path and project', async () => {
    BackgroundImage.qm.getOneById.mockResolvedValue({
      id: 'bg-3',
      projectId: 'project-1',
    });
    Project.qm.getOneById.mockResolvedValue({ id: 'project-1' });
    const result = await getPathToProject.fn({ id: 'bg-3' });
    expect(result).toEqual({
      backgroundImage: { id: 'bg-3', projectId: 'project-1' },
      project: { id: 'project-1' },
    });
  });
  test('throws pathNotFound when background image is missing', async () => {
    BackgroundImage.qm.getOneById.mockResolvedValue(null);
    await expect(getPathToProject.fn({ id: 'bg-missing' })).rejects.toBe('pathNotFound');
  });
  test('throws pathNotFound when project is missing', async () => {
    BackgroundImage.qm.getOneById.mockResolvedValue({
      id: 'bg-4',
      projectId: 'project-2',
    });
    Project.qm.getOneById.mockResolvedValue(null);
    await expect(getPathToProject.fn({ id: 'bg-4' })).rejects.toEqual({
      pathNotFound: {
        backgroundImage: { id: 'bg-4', projectId: 'project-2' },
      },
    });
  });
  test('removes related files for single image', () => {
    removeRelatedFiles.fn({ recordOrRecords: { dirname: 'dir-2' } });
    const fileManager = sails.hooks['file-manager'].getInstance();
    expect(fileManager.deleteDir).toHaveBeenCalledWith('backgrounds/dir-2');
  });
  test('removes related files for multiple images', () => {
    removeRelatedFiles.fn({
      recordOrRecords: [{ dirname: 'dir-3' }, { dirname: 'dir-4' }],
    });
    const fileManager = sails.hooks['file-manager'].getInstance();
    expect(fileManager.deleteDir).toHaveBeenCalledWith('backgrounds/dir-3');
    expect(fileManager.deleteDir).toHaveBeenCalledWith('backgrounds/dir-4');
  });
  test('deletes background image and notifies project users', async () => {
    const scoper = {
      getProjectRelatedUserIds: jest.fn().mockResolvedValue(['user-1', 'user-2']),
    };
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);
    BackgroundImage.qm.deleteOne.mockResolvedValue({
      id: 'bg-5',
      dirname: 'dir-5',
    });
    const result = await deleteBackgroundImage.fn({
      record: { id: 'bg-5' },
      project: {
        id: 'project-3',
        backgroundType: 'image',
        backgroundImageId: 'bg-5',
      },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });
    expect(result).toEqual({ id: 'bg-5', dirname: 'dir-5' });
    expect(sails.helpers.projects.updateOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: { backgroundType: null },
      }),
    );
    expect(sails.helpers.backgroundImages.removeRelatedFiles).toHaveBeenCalledWith({
      id: 'bg-5',
      dirname: 'dir-5',
    });
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('returns null when background image is already deleted', async () => {
    const scoper = {
      getProjectRelatedUserIds: jest.fn().mockResolvedValue([]),
    };
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);
    BackgroundImage.qm.deleteOne.mockResolvedValue(null);
    const result = await deleteBackgroundImage.fn({
      record: { id: 'bg-6' },
      project: {
        id: 'project-4',
        backgroundType: 'image',
        backgroundImageId: 'bg-6',
      },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-2' },
    });
    expect(result).toBeNull();
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });
});
