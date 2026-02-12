const originalNotificationService = global.NotificationService;
const originalSails = global.sails;

global.NotificationService = {
  Formats: {
    JSON: 'json',
    MARKDOWN: 'markdown',
  },
};

const createInBoardController = require('../api/controllers/notification-services/create-in-board');
const createInUserController = require('../api/controllers/notification-services/create-in-user');
const deleteController = require('../api/controllers/notification-services/delete');
const updateController = require('../api/controllers/notification-services/update');
const testController = require('../api/controllers/notification-services/test');

const originalLodash = global._;

const makeInterceptable = (value, codeToThrow) => ({
  intercept(code, handler) {
    if (code === codeToThrow) {
      throw handler();
    }

    return value;
  },
});

describe('notification-services controllers', () => {
  beforeEach(() => {
    global._ = require('lodash'); // eslint-disable-line global-require

    global.sails = {
      helpers: {
        boards: {
          getPathToProjectById: jest.fn(),
        },
        users: {
          isProjectManager: jest.fn(),
        },
        notificationServices: {
          getPathToUserById: jest.fn(),
          createOneInBoard: {
            with: jest.fn(),
          },
          createOneInUser: {
            with: jest.fn(),
          },
          deleteOneInUser: {
            with: jest.fn(),
          },
          deleteOneInBoard: {
            with: jest.fn(),
          },
          updateOneInUser: {
            with: jest.fn(),
          },
          updateOneInBoard: {
            with: jest.fn(),
          },
          testOne: {
            with: jest.fn(),
          },
        },
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.NotificationService = originalNotificationService;
    global.sails = originalSails;
    global._ = originalLodash;
  });

  test('create-in-board handles board not found, forbidden and limit reached', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.boards.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(
      createInBoardController.fn.call(
        { req },
        { boardId: 'b1', url: 'https://hook', format: 'json' },
      ),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });

    sails.helpers.boards.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({ board: { id: 'b1' }, project: { id: 'p1' } }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(
      createInBoardController.fn.call(
        { req },
        { boardId: 'b1', url: 'https://hook', format: 'json' },
      ),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });

    sails.helpers.boards.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({ board: { id: 'b1' }, project: { id: 'p1' } }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    sails.helpers.notificationServices.createOneInBoard.with.mockReturnValueOnce(
      makeInterceptable({}, 'limitReached'),
    );
    await expect(
      createInBoardController.fn.call(
        { req },
        { boardId: 'b1', url: 'https://hook', format: 'json' },
      ),
    ).rejects.toEqual({
      limitReached: 'Limit reached',
    });
  });

  test('create-in-board creates notification service', async () => {
    const req = { currentUser: { id: 'u1' } };
    const board = { id: 'b1' };
    const project = { id: 'p1' };
    const created = { id: 'ns1' };

    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable({ board, project }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.notificationServices.createOneInBoard.with.mockReturnValue(
      makeInterceptable(created),
    );

    const result = await createInBoardController.fn.call(
      { req },
      { boardId: 'b1', url: 'https://hook', format: 'json' },
    );

    expect(result).toEqual({ item: created });
  });

  test('create-in-user handles forbidden and limit reached, then succeeds', async () => {
    const req = { currentUser: { id: 'u1' } };

    await expect(
      createInUserController.fn.call(
        { req },
        { userId: 'u2', url: 'https://hook', format: 'json' },
      ),
    ).rejects.toEqual({
      userNotFound: 'User not found',
    });

    sails.helpers.notificationServices.createOneInUser.with.mockReturnValueOnce(
      makeInterceptable({}, 'limitReached'),
    );
    await expect(
      createInUserController.fn.call(
        { req },
        { userId: 'u1', url: 'https://hook', format: 'json' },
      ),
    ).rejects.toEqual({
      limitReached: 'Limit reached',
    });

    const created = { id: 'ns1' };
    sails.helpers.notificationServices.createOneInUser.with.mockReturnValueOnce(
      makeInterceptable(created),
    );
    const result = await createInUserController.fn.call(
      { req },
      { userId: 'u1', url: 'https://hook', format: 'json' },
    );

    expect(result).toEqual({ item: created });
  });

  test('delete handles missing path and access checks', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.notificationServices.getPathToUserById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(deleteController.fn.call({ req }, { id: 'ns1' })).rejects.toEqual({
      notificationServiceNotFound: 'Notification service not found',
    });

    sails.helpers.notificationServices.getPathToUserById.mockReturnValueOnce(
      makeInterceptable({
        notificationService: { id: 'ns1', userId: 'u2' },
        user: { id: 'u2' },
      }),
    );
    await expect(deleteController.fn.call({ req }, { id: 'ns1' })).rejects.toEqual({
      notificationServiceNotFound: 'Notification service not found',
    });

    sails.helpers.notificationServices.getPathToUserById.mockReturnValueOnce(
      makeInterceptable({
        notificationService: { id: 'ns1', boardId: 'b1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(deleteController.fn.call({ req }, { id: 'ns1' })).rejects.toEqual({
      notificationServiceNotFound: 'Notification service not found',
    });
  });

  test('delete removes service for user and board paths', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.notificationServices.getPathToUserById.mockReturnValueOnce(
      makeInterceptable({
        notificationService: { id: 'ns1', userId: 'u1' },
        user: { id: 'u1' },
      }),
    );
    sails.helpers.notificationServices.deleteOneInUser.with.mockResolvedValueOnce(null);
    await expect(deleteController.fn.call({ req }, { id: 'ns1' })).rejects.toEqual({
      notificationServiceNotFound: 'Notification service not found',
    });

    sails.helpers.notificationServices.getPathToUserById.mockReturnValueOnce(
      makeInterceptable({
        notificationService: { id: 'ns2', boardId: 'b1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    sails.helpers.notificationServices.deleteOneInBoard.with.mockResolvedValueOnce({ id: 'ns2' });

    const result = await deleteController.fn.call({ req }, { id: 'ns2' });
    expect(result).toEqual({ item: { id: 'ns2' } });
  });

  test('update handles missing path and access checks', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.notificationServices.getPathToUserById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(
      updateController.fn.call({ req }, { id: 'ns1', url: 'https://new' }),
    ).rejects.toEqual({
      notificationServiceNotFound: 'Notification service not found',
    });

    sails.helpers.notificationServices.getPathToUserById.mockReturnValueOnce(
      makeInterceptable({
        notificationService: { id: 'ns1', userId: 'u2' },
        user: { id: 'u2' },
      }),
    );
    await expect(
      updateController.fn.call({ req }, { id: 'ns1', url: 'https://new' }),
    ).rejects.toEqual({
      notificationServiceNotFound: 'Notification service not found',
    });

    sails.helpers.notificationServices.getPathToUserById.mockReturnValueOnce(
      makeInterceptable({
        notificationService: { id: 'ns1', boardId: 'b1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(
      updateController.fn.call({ req }, { id: 'ns1', format: 'markdown' }),
    ).rejects.toEqual({
      notificationServiceNotFound: 'Notification service not found',
    });
  });

  test('update updates service for user and board paths', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.notificationServices.getPathToUserById.mockReturnValueOnce(
      makeInterceptable({
        notificationService: { id: 'ns1', userId: 'u1' },
        user: { id: 'u1' },
      }),
    );
    sails.helpers.notificationServices.updateOneInUser.with.mockResolvedValueOnce(null);
    await expect(
      updateController.fn.call({ req }, { id: 'ns1', url: 'https://new' }),
    ).rejects.toEqual({
      notificationServiceNotFound: 'Notification service not found',
    });

    sails.helpers.notificationServices.getPathToUserById.mockReturnValueOnce(
      makeInterceptable({
        notificationService: { id: 'ns2', boardId: 'b1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    sails.helpers.notificationServices.updateOneInBoard.with.mockResolvedValueOnce({ id: 'ns2' });

    const result = await updateController.fn.call(
      { req },
      { id: 'ns2', url: 'https://new', format: 'markdown' },
    );
    expect(result).toEqual({ item: { id: 'ns2' } });
  });

  test('test controller enforces access and runs helper', async () => {
    const req = { currentUser: { id: 'u1' }, i18n: { __: jest.fn() } };

    sails.helpers.notificationServices.getPathToUserById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(testController.fn.call({ req }, { id: 'ns1' })).rejects.toEqual({
      notificationServiceNotFound: 'Notification service not found',
    });

    sails.helpers.notificationServices.getPathToUserById.mockReturnValueOnce(
      makeInterceptable({
        notificationService: { id: 'ns1', userId: 'u2' },
        user: { id: 'u2' },
      }),
    );
    await expect(testController.fn.call({ req }, { id: 'ns1' })).rejects.toEqual({
      notificationServiceNotFound: 'Notification service not found',
    });

    sails.helpers.notificationServices.getPathToUserById.mockReturnValueOnce(
      makeInterceptable({
        notificationService: { id: 'ns1', boardId: 'b1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(testController.fn.call({ req }, { id: 'ns1' })).rejects.toEqual({
      notificationServiceNotFound: 'Notification service not found',
    });

    const notificationService = { id: 'ns2', userId: 'u1' };
    sails.helpers.notificationServices.getPathToUserById.mockReturnValueOnce(
      makeInterceptable({
        notificationService,
        user: { id: 'u1' },
      }),
    );
    sails.helpers.notificationServices.testOne.with.mockResolvedValueOnce(undefined);

    const result = await testController.fn.call({ req }, { id: 'ns2' });
    expect(result).toEqual({ item: notificationService });
  });
});
