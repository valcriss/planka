let controller; // required lazily after globals are prepared

// We'll stub global objects (sails, _, Board, etc.) minimally for the controller logic.
// This avoids spinning up a full Sails app and keeps tests fast & deterministic.

describe('boards/update controller', () => {
  let originalGlobals;
  let currentUser;
  let boardRecord;
  let projectRecord;

  beforeEach(() => {
    originalGlobals = {
      sails: global.sails,
      _: global._,
      Board: global.Board,
    };

    // lodash is already present in runtime for other tests; fallback to require if absent
    // eslint-disable-next-line global-require
    if (!global._) global._ = require('lodash');

    currentUser = { id: 'u1', role: 'member' };
    boardRecord = { id: 'b1', name: 'Board A', defaultView: 'kanban' };
    projectRecord = { id: 'p1', useScrum: false };

    const getPathToProjectByIdImpl = jest.fn(() => ({
      intercept: () => ({ board: boardRecord, project: projectRecord }),
    }));

    global.sails = {
      helpers: {
        boards: {
          getPathToProjectById: getPathToProjectByIdImpl,
          updateOne: {
            with: jest.fn().mockResolvedValue({ id: 'b1', name: 'Board A', showCardCount: true }),
          },
        },
        users: {
          isProjectManager: jest.fn().mockResolvedValue(false),
          isBoardMember: jest.fn().mockResolvedValue(false),
        },
        cardTypes: {
          getOrCreateForProject: {
            with: () => ({
              intercept: () => Promise.resolve({ id: 'ct1', name: 'Bug' }),
            }),
          },
        },
      },
    };

    global.Board = { Views: { kanban: 'kanban', table: 'table' } };

    // Require controller after setting globals it depends on (Board, _,...)
    // to avoid ReferenceError at module evaluation time.
    // eslint-disable-next-line global-require
    controller = require('../api/controllers/boards/update');
  });

  afterEach(() => {
    global.sails = originalGlobals.sails;
    global._ = originalGlobals._;
    global.Board = originalGlobals.Board;
    jest.restoreAllMocks();
  });

  const run = (inputs, overrides = {}) => {
    const ctx = { req: { currentUser: { ...currentUser, ...overrides.user } } };
    return controller.fn.call(ctx, inputs);
  };

  test('rejects when user is neither project manager nor board member', async () => {
    await expect(run({ id: 'b1', isSubscribed: true })).rejects.toMatchObject({
      boardNotFound: 'Board not found',
    });
  });

  test('allows board member to set isSubscribed but rejects other fields', async () => {
    global.sails.helpers.users.isBoardMember.mockResolvedValue(true);

    // Valid change
    await expect(run({ id: 'b1', isSubscribed: true })).resolves.toMatchObject({
      item: expect.objectContaining({ id: 'b1' }),
    });

    // Attempt forbidden field (name)
    await expect(run({ id: 'b1', name: 'New Name' })).rejects.toMatchObject({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('project manager can change name and showCardCount (non-scrum project)', async () => {
    global.sails.helpers.users.isProjectManager.mockResolvedValue(true);

    const res = await run({ id: 'b1', name: 'Board B', showCardCount: true });
    expect(res.item).toMatchObject({ id: 'b1' });
    expect(global.sails.helpers.boards.updateOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({ name: 'Board B', showCardCount: true }),
      }),
    );
  });

  test('forcing showCardCount to false when project.useScrum = true', async () => {
    global.sails.helpers.users.isProjectManager.mockResolvedValue(true);
    projectRecord.useScrum = true;

    await run({ id: 'b1', showCardCount: true });
    expect(global.sails.helpers.boards.updateOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({ showCardCount: false }),
      }),
    );
  });

  test('resolves defaultCardTypeId via helper', async () => {
    global.sails.helpers.users.isProjectManager.mockResolvedValue(true);

    await run({ id: 'b1', defaultCardTypeId: 'ct1' });
    expect(global.sails.helpers.cardTypes.getOrCreateForProject.with).toBeDefined();
    expect(global.sails.helpers.boards.updateOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({ defaultCardType: 'Bug', defaultCardTypeId: 'ct1' }),
      }),
    );
  });

  test('card type not found intercept triggers error', async () => {
    global.sails.helpers.users.isProjectManager.mockResolvedValue(true);
    global.sails.helpers.cardTypes.getOrCreateForProject.with = () => ({
      intercept: (code, handler) => {
        if (code === 'notFound') {
          const error = handler();
          return Promise.reject(error);
        }
        return Promise.resolve({ id: 'ct1', name: 'Bug' });
      },
    });

    await expect(run({ id: 'b1', defaultCardTypeId: 'missing' })).rejects.toMatchObject({
      cardTypeNotFound: 'Card type not found',
    });
  });
});
