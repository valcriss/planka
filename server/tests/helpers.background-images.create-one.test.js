const createBackgroundImage = require('../api/helpers/background-images/create-one');

const originalSails = global.sails;
const originalBackgroundImage = global.BackgroundImage;
const originalWebhook = global.Webhook;
const originalProject = global.Project;

describe('helpers/background-images/create-one', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        projects: {
          makeScoper: {
            with: jest.fn(),
          },
          updateOne: {
            with: jest.fn(),
          },
        },
        backgroundImages: {
          presentOne: jest.fn((image) => ({ id: image.id })),
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
        createOne: jest.fn(),
      },
    };

    global.Project = {
      BackgroundTypes: {
        IMAGE: 'image',
      },
    };

    global.Webhook = {
      Events: {
        BACKGROUND_IMAGE_CREATE: 'backgroundImageCreate',
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

    if (typeof originalBackgroundImage === 'undefined') {
      delete global.BackgroundImage;
    } else {
      global.BackgroundImage = originalBackgroundImage;
    }

    if (typeof originalWebhook === 'undefined') {
      delete global.Webhook;
    } else {
      global.Webhook = originalWebhook;
    }

    if (typeof originalProject === 'undefined') {
      delete global.Project;
    } else {
      global.Project = originalProject;
    }
  });

  test('creates background image, broadcasts, and updates project', async () => {
    const backgroundImage = { id: 'bg-1' };
    const scoper = {
      getProjectRelatedUserIds: jest.fn().mockResolvedValue(['user-1', 'user-2']),
    };

    BackgroundImage.qm.createOne.mockResolvedValue(backgroundImage);
    Webhook.qm.getAll.mockResolvedValue([{ id: 'wh-1' }]);
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);

    const inputs = {
      values: { project: { id: 'project-1' } },
      actorUser: { id: 'actor-1' },
      requestId: 'req-1',
      request: { id: 'req-1' },
    };

    const result = await createBackgroundImage.fn(inputs);

    expect(result).toBe(backgroundImage);
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalledTimes(1);
    expect(sails.helpers.projects.updateOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: {
          backgroundImage,
          backgroundType: Project.BackgroundTypes.IMAGE,
        },
      }),
    );
  });
});
