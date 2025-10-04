const _ = require('lodash');

const original = {
  _: global._,
  BoardMembership: global.BoardMembership,
  sails: global.sails,
  Project: global.Project,
  List: global.List,
};

const ensureGlobals = () => {
  global._ = _;
  global.Project = global.Project || { Types: { PRIVATE: 'private', SHARED: 'shared' } };
  global.List = global.List || { Types: { ACTIVE: 'active' } };
  global.BoardMembership = global.BoardMembership || {
    Roles: { EDITOR: 'editor', VIEWER: 'viewer' },
    qm: { getOneByBoardIdAndUserId: jest.fn() },
  };
  global.sails = global.sails || { helpers: {} };
  global.sails.helpers = global.sails.helpers || {};
  global.sails.helpers.lists = global.sails.helpers.lists || {};
  global.sails.helpers.cards = global.sails.helpers.cards || {};
  global.sails.helpers.cardTypes = global.sails.helpers.cardTypes || {};
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

const createController = require('../api/controllers/cards/create');
const deleteController = require('../api/controllers/cards/delete');

describe('cards CRUD controllers', () => {
  beforeEach(() => {
    ensureGlobals();
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockReset();

    setHelper(['lists', 'getPathToProjectById'], (listId) => ({
      intercept: () => ({
        list: { id: listId },
        board: { id: 'board1' },
        project: { id: 'proj1' },
      }),
    }));
    // Helper mocks with intercept-capable chains
    setHelper(['cards', 'createOne'], {
      with: jest.fn((args) => ({
        intercept(code, handler) {
          const vals = (args && args.values) || {};
          if (
            code === 'positionMustBeInValues' &&
            Object.prototype.hasOwnProperty.call(vals, 'position') &&
            vals.position == null
          ) {
            throw handler();
          }
          return { id: 'c1', name: vals.name || 'Card', ...vals };
        },
      })),
    });
    setHelper(['cards', 'deleteOne'], {
      with: jest.fn((args) => ({
        // delete controller doesn't use intercept
        id: args.record.id,
      })),
    });
    setHelper(['cards', 'getPathToProjectById'], (id) => ({
      intercept: () => ({
        card: { id, name: 'Card' },
        list: { id: 'list1' },
        board: { id: 'board1' },
        project: { id: 'proj1' },
      }),
    }));
    setHelper(['cardTypes', 'getOrCreateForProject'], {
      with: jest.fn((args) => ({
        intercept(code, handler) {
          if (code === 'notFound' && args.id === 'bad') {
            throw handler();
          }
          return { id: args.id, name: 'Bug' };
        },
      })),
    });
  });

  afterAll(() => {
    if (typeof original._ === 'undefined') {
      delete global._;
    } else {
      global._ = original._;
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
    if (typeof original.Project === 'undefined') {
      delete global.Project;
    } else {
      global.Project = original.Project;
    }
    if (typeof original.List === 'undefined') {
      delete global.List;
    } else {
      global.List = original.List;
    }
  });

  test('create card success simple', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm',
      role: 'editor',
    });
    const ctx = makeCtx();
    const result = await createController.fn.call(ctx, { listId: 'list1', name: 'Card' });
    expect(result.item).toEqual(expect.objectContaining({ id: 'c1', name: 'Card' }));
  });

  test('create card with cardTypeId success maps card type', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm',
      role: 'editor',
    });
    const ctx = makeCtx();
    const result = await createController.fn.call(ctx, {
      listId: 'list1',
      name: 'New card',
      cardTypeId: 'ct1',
    });
    expect(global.sails.helpers.cardTypes.getOrCreateForProject.with).toHaveBeenCalled();
    expect(result.item.type).toBe('Bug');
  });

  test('create card card type not found intercept', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm',
      role: 'editor',
    });
    const ctx = makeCtx();
    await expect(
      createController.fn.call(ctx, { listId: 'list1', name: 'X', cardTypeId: 'bad' }),
    ).rejects.toMatchObject({ cardTypeNotFound: 'Card type not found' });
  });

  test('create card position must be present intercept', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm',
      role: 'editor',
    });
    const ctx = makeCtx();
    await expect(
      createController.fn.call(ctx, { listId: 'list1', name: 'NoPos', position: null }),
    ).rejects.toMatchObject({ positionMustBePresent: 'Position must be present' });
  });

  test('create card list not found intercept path', async () => {
    setHelper(['lists', 'getPathToProjectById'], () => ({
      intercept(code, handler) {
        if (code === 'pathNotFound') {
          throw handler();
        }
        return { list: { id: 'missing' }, board: { id: 'boardX' }, project: { id: 'projX' } };
      },
    }));
    const ctx = makeCtx();
    await expect(
      createController.fn.call(ctx, { listId: 'missing', name: 'X' }),
    ).rejects.toMatchObject({ listNotFound: 'List not found' });
  });

  test('create card list not found when no membership', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);
    const ctx = makeCtx();
    await expect(
      createController.fn.call(ctx, { listId: 'list1', name: 'X' }),
    ).rejects.toMatchObject({ listNotFound: 'List not found' });
  });

  test('create card not enough rights when membership role viewer', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm',
      role: 'viewer',
    });
    const ctx = makeCtx();
    await expect(
      createController.fn.call(ctx, { listId: 'list1', name: 'X' }),
    ).rejects.toMatchObject({ notEnoughRights: 'Not enough rights' });
  });

  test('delete card success', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm',
      role: 'editor',
    });
    global.sails.helpers.cards.deleteOne.with.mockResolvedValue({ id: 'c10' });
    const ctx = makeCtx();
    const result = await deleteController.fn.call(ctx, { id: 'c10' });
    expect(result.item).toEqual({ id: 'c10' });
  });

  test('delete card not enough rights', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm',
      role: 'viewer',
    });
    const ctx = makeCtx();
    await expect(deleteController.fn.call(ctx, { id: 'c11' })).rejects.toMatchObject({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('delete card card not found when membership missing', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);
    const ctx = makeCtx();
    await expect(deleteController.fn.call(ctx, { id: 'c12' })).rejects.toMatchObject({
      cardNotFound: 'Card not found',
    });
  });

  test('delete card card not found when deleteOne returns null', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm',
      role: 'editor',
    });
    global.sails.helpers.cards.deleteOne.with.mockResolvedValue(null);
    const ctx = makeCtx();
    await expect(deleteController.fn.call(ctx, { id: 'c13' })).rejects.toMatchObject({
      cardNotFound: 'Card not found',
    });
  });
});
