let controller; // lazy require after globals

// Tests focus on permission branches, cardLimit validation, card type resolution & error paths.

describe('lists/update controller', () => {
  let originalGlobals;
  let currentUser;
  let listRecord;
  let boardRecord;
  let projectRecord;
  let pathNotFoundFlag;
  let updateReturnsNull;
  let simulateCardTypeNotFound;

  beforeEach(() => {
    originalGlobals = {
      sails: global.sails,
      _: global._,
      List: global.List,
      BoardMembership: global.BoardMembership,
    };

    // Ensure lodash available
    // eslint-disable-next-line global-require
    if (!global._) global._ = require('lodash');

    currentUser = { id: 'u1', role: 'member' };
    listRecord = { id: 'l1', name: 'List A' };
    boardRecord = { id: 'b1' };
    projectRecord = { id: 'p1' };

    pathNotFoundFlag = false;
    updateReturnsNull = false;
    simulateCardTypeNotFound = false;

    const getPathToProjectByIdImpl = jest.fn(() => ({
      intercept: (code, handler) => {
        if (pathNotFoundFlag && code === 'pathNotFound') {
          return Promise.reject(handler());
        }
        return { list: listRecord, board: boardRecord, project: projectRecord };
      },
    }));

    const updateOneImpl = {
      with: jest.fn().mockImplementation(({ values }) => {
        if (updateReturnsNull) return null;
        return Promise.resolve({ id: 'l1', ...values });
      }),
    };

    const cardTypeHelper = {
      with: () => ({
        intercept: (code, handler) => {
          if (simulateCardTypeNotFound && code === 'notFound') {
            return Promise.reject(handler());
          }
          return Promise.resolve({ id: 'ct1', name: 'Bug' });
        },
      }),
    };

    global.sails = {
      helpers: {
        lists: {
          getPathToProjectById: getPathToProjectByIdImpl,
          updateOne: updateOneImpl,
          isFinite: jest.fn().mockReturnValue(true),
        },
        cardTypes: { getOrCreateForProject: cardTypeHelper },
      },
    };

    global.List = {
      FINITE_TYPES: ['active', 'closed'],
      COLORS: ['red', 'green'],
    };

    global.BoardMembership = {
      Roles: { EDITOR: 'editor', VIEWER: 'viewer' },
      qm: {
        getOneByBoardIdAndUserId: jest.fn().mockResolvedValue({ id: 'bm1', role: 'editor' }),
      },
    };

    // Lazy require after globals set
    // eslint-disable-next-line global-require
    controller = require('../api/controllers/lists/update');
  });

  afterEach(() => {
    global.sails = originalGlobals.sails;
    global._ = originalGlobals._;
    global.List = originalGlobals.List;
    global.BoardMembership = originalGlobals.BoardMembership;
    jest.restoreAllMocks();
  });

  const run = (inputs, overrides = {}) => {
    const ctx = { req: { currentUser: { ...currentUser, ...overrides.user } } };
    return controller.fn.call(ctx, inputs);
  };

  test('rejects when path not found (intercept)', async () => {
    pathNotFoundFlag = true;
    await expect(run({ id: 'l1', name: 'X' })).rejects.toMatchObject({
      listNotFound: 'List not found',
    });
  });

  test('rejects when user not a board member (LIST_NOT_FOUND masking)', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);
    await expect(run({ id: 'l1', name: 'X' })).rejects.toMatchObject({
      listNotFound: 'List not found',
    });
  });

  test('rejects when list is not finite', async () => {
    global.sails.helpers.lists.isFinite.mockReturnValue(false);
    await expect(run({ id: 'l1', name: 'X' })).rejects.toMatchObject({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('rejects when board membership role is not EDITOR', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm2',
      role: 'viewer',
    });
    await expect(run({ id: 'l1', name: 'X' })).rejects.toMatchObject({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('rejects invalid cardLimit: null', async () => {
    await expect(run({ id: 'l1', cardLimit: null })).rejects.toMatchObject({
      invalidCardLimit: 'Invalid card limit',
    });
  });

  test('rejects invalid cardLimit: empty string', async () => {
    await expect(run({ id: 'l1', cardLimit: '' })).rejects.toMatchObject({
      invalidCardLimit: 'Invalid card limit',
    });
  });

  test('rejects invalid cardLimit: negative number', async () => {
    await expect(run({ id: 'l1', cardLimit: -1 })).rejects.toMatchObject({
      invalidCardLimit: 'Invalid card limit',
    });
  });

  test('rejects invalid cardLimit: non-integer', async () => {
    await expect(run({ id: 'l1', cardLimit: 2.5 })).rejects.toMatchObject({
      invalidCardLimit: 'Invalid card limit',
    });
  });

  test('accepts valid cardLimit coerced from string', async () => {
    const res = await run({ id: 'l1', cardLimit: '5' });
    expect(res.item).toMatchObject({ cardLimit: 5 });
    expect(global.sails.helpers.lists.updateOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({ cardLimit: 5 }),
      }),
    );
  });

  test('resolves defaultCardTypeId via helper', async () => {
    const res = await run({ id: 'l1', defaultCardTypeId: 'ct1' });
    expect(res.item).toMatchObject({ defaultCardTypeId: 'ct1', defaultCardType: 'Bug' });
  });

  test('card type not found intercept triggers error', async () => {
    simulateCardTypeNotFound = true;
    global.sails.helpers.cardTypes.getOrCreateForProject = {
      with: () => ({
        intercept: (code, handler) => {
          if (code === 'notFound') return Promise.reject(handler());
          return Promise.resolve({ id: 'ct1', name: 'Bug' });
        },
      }),
    };

    await expect(run({ id: 'l1', defaultCardTypeId: 'missing' })).rejects.toMatchObject({
      cardTypeNotFound: 'Card type not found',
    });
  });

  test('updateOne returns null → listNotFound', async () => {
    updateReturnsNull = true;
    await expect(run({ id: 'l1', name: 'Nope' })).rejects.toMatchObject({
      listNotFound: 'List not found',
    });
  });

  test('successful basic update', async () => {
    const res = await run({ id: 'l1', name: 'Renamed', cardLimit: 3 });
    expect(res.item).toMatchObject({ name: 'Renamed', cardLimit: 3 });
  });
});
