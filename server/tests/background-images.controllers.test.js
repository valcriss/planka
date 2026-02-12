const _ = require('lodash');

const backgroundImagesCreateController = require('../api/controllers/background-images/create');
const backgroundImagesDeleteController = require('../api/controllers/background-images/delete');

const originalSails = global.sails;
const originalProject = global.Project;
const originalLodash = global._;

const makeInterceptable = (promise) => ({
  intercept: (code, handler) =>
    makeInterceptable(
      promise.catch((error) => {
        if (error === code || (error && error.code === code)) {
          throw handler();
        }
        throw error;
      }),
    ),
  then: (...args) => promise.then(...args),
  catch: (...args) => promise.catch(...args),
  finally: (...args) => promise.finally(...args),
});

const buildError = (code) => {
  const error = new Error(code);
  error.code = code;
  return error;
};

describe('background-images controllers', () => {
  beforeEach(() => {
    global._ = _;

    global.sails = {
      helpers: {
        users: {
          isProjectManager: jest.fn(),
        },
        utils: {
          receiveFile: jest.fn(),
        },
        backgroundImages: {
          processUploadedFile: jest.fn(),
          createOne: { with: jest.fn() },
          presentOne: jest.fn((item) => item),
          getPathToProjectById: jest.fn(),
          deleteOne: { with: jest.fn() },
        },
      },
    };

    global.Project = {
      qm: {
        getOneById: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.Project = originalProject;
    global._ = originalLodash;
  });

  const exits = {
    success: (value) => value,
    uploadError: (message) => ({ uploadError: message }),
  };

  test('background-images/create throws when project is missing', async () => {
    Project.qm.getOneById.mockResolvedValue(null);

    await expect(
      backgroundImagesCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { projectId: 'p1' },
        exits,
      ),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });
  });

  test('background-images/create throws when user lacks access', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      backgroundImagesCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { projectId: 'p1' },
        exits,
      ),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });
  });

  test('background-images/create returns upload error when receiveFile fails', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.utils.receiveFile.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await backgroundImagesCreateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { projectId: 'p1' },
      exits,
    );

    expect(result).toEqual({ uploadError: 'boom' });
  });

  test('background-images/create throws when no files uploaded', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.utils.receiveFile.mockResolvedValue([]);

    await expect(
      backgroundImagesCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { projectId: 'p1' },
        exits,
      ),
    ).rejects.toEqual({
      noFileWasUploaded: 'No file was uploaded',
    });
  });

  test('background-images/create throws when uploaded file is not image', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.utils.receiveFile.mockResolvedValue([{ path: 'file.png' }]);
    sails.helpers.backgroundImages.processUploadedFile.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('fileIsNotImage'))),
    );

    await expect(
      backgroundImagesCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { projectId: 'p1' },
        exits,
      ),
    ).rejects.toEqual({
      fileIsNotImage: 'File is not image',
    });
  });

  test('background-images/create returns created item', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.utils.receiveFile.mockResolvedValue([{ path: 'file.png' }]);
    sails.helpers.backgroundImages.processUploadedFile.mockReturnValue(
      makeInterceptable(Promise.resolve({ path: 'file.png' })),
    );
    sails.helpers.backgroundImages.createOne.with.mockResolvedValue({ id: 'bg1' });

    const result = await backgroundImagesCreateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { projectId: 'p1', requestId: 'req1' },
      exits,
    );

    expect(sails.helpers.backgroundImages.createOne.with).toHaveBeenCalledWith({
      values: {
        path: 'file.png',
        project: { id: 'p1' },
      },
      actorUser: { id: 'u1' },
      requestId: 'req1',
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'bg1' } });
  });

  test('background-images/delete throws when path is missing', async () => {
    sails.helpers.backgroundImages.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      backgroundImagesDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bg1' },
      ),
    ).rejects.toEqual({
      backgroundImageNotFound: 'Background image not found',
    });
  });

  test('background-images/delete throws when user lacks access', async () => {
    sails.helpers.backgroundImages.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          backgroundImage: { id: 'bg1' },
          project: { id: 'p1' },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      backgroundImagesDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bg1' },
      ),
    ).rejects.toEqual({
      backgroundImageNotFound: 'Background image not found',
    });
  });

  test('background-images/delete throws when deleteOne returns null', async () => {
    sails.helpers.backgroundImages.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          backgroundImage: { id: 'bg1' },
          project: { id: 'p1' },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.backgroundImages.deleteOne.with.mockResolvedValue(null);

    await expect(
      backgroundImagesDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bg1' },
      ),
    ).rejects.toEqual({
      backgroundImageNotFound: 'Background image not found',
    });
  });

  test('background-images/delete returns deleted item', async () => {
    sails.helpers.backgroundImages.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          backgroundImage: { id: 'bg1' },
          project: { id: 'p1' },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.backgroundImages.deleteOne.with.mockResolvedValue({ id: 'bg1' });

    const result = await backgroundImagesDeleteController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'bg1' },
    );

    expect(result).toEqual({ item: { id: 'bg1' } });
  });
});
