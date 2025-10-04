const { mockSailsBase, defineHelper, callController } = require('./_helpers/controllerTestUtils');

// We will test create, update, delete for labels with shared setup.

describe('labels CRUD controllers', () => {
  let originalGlobals;
  let createController;
  let updateController;
  let deleteController;

  beforeEach(() => {
    originalGlobals = {
      sails: global.sails,
      Label: global.Label,
      BoardMembership: global.BoardMembership,
      List: global.List,
    };

    mockSailsBase();

    // Minimal Label global with COLORS constant used in validation
    global.Label = {
      COLORS: ['berry-red', 'lagoon-blue'],
    };

    global.BoardMembership = {
      Roles: { EDITOR: 'editor' },
      qm: {
        getOneByBoardIdAndUserId: jest.fn().mockResolvedValue({ id: 'bm1', role: 'editor' }),
      },
    };

    // Helpers needed by controllers
    defineHelper(['boards', 'getPathToProjectById'], (boardId) => ({
      intercept: () => ({
        board: { id: boardId },
        project: { id: 'project-1' },
      }),
    }));

    defineHelper(['labels', 'getPathToProjectById'], (labelId) => ({
      intercept: () => ({
        label: { id: labelId, name: 'Old', color: 'berry-red' },
        board: { id: 'board-1' },
        project: { id: 'project-1' },
      }),
    }));

    defineHelper(['labels', 'createOne'], {
      with: jest.fn().mockResolvedValue({ id: 'label-new', name: 'My Label', color: 'berry-red' }),
    });
    defineHelper(['labels', 'updateOne'], {
      with: jest.fn().mockResolvedValue({ id: 'label-1', name: 'New Name', color: 'lagoon-blue' }),
    });
    defineHelper(['labels', 'deleteOne'], {
      with: jest.fn().mockResolvedValue({ id: 'label-1', name: 'Old', color: 'berry-red' }),
    });

    // Lazy require after globals present
    // eslint-disable-next-line global-require
    createController = require('../api/controllers/labels/create');
    // eslint-disable-next-line global-require
    updateController = require('../api/controllers/labels/update');
    // eslint-disable-next-line global-require
    deleteController = require('../api/controllers/labels/delete');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.sails = originalGlobals.sails;
    global.Label = originalGlobals.Label;
    global.BoardMembership = originalGlobals.BoardMembership;
  });

  test('create label success', async () => {
    const res = await callController(createController, {
      inputs: { boardId: 'board-1', position: 1000, name: 'My Label', color: 'berry-red' },
    });
    expect(res.item).toMatchObject({ id: 'label-new', name: 'My Label' });
  });

  test('create label forbidden when not board member', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);
    await expect(
      callController(createController, {
        inputs: { boardId: 'board-1', position: 1000, name: 'X', color: 'berry-red' },
      }),
    ).rejects.toMatchObject({ boardNotFound: 'Board not found' });
  });

  test('create label notEnoughRights when role not editor', async () => {
    global.BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      id: 'bm1',
      role: 'viewer',
    });
    await expect(
      callController(createController, {
        inputs: { boardId: 'board-1', position: 1000, name: 'X', color: 'berry-red' },
      }),
    ).rejects.toMatchObject({ notEnoughRights: 'Not enough rights' });
  });

  test('update label success', async () => {
    const res = await callController(updateController, {
      inputs: { id: 'label-1', name: 'New Name', color: 'lagoon-blue' },
    });
    expect(res.item).toMatchObject({ name: 'New Name', color: 'lagoon-blue' });
  });

  test('update label labelNotFound when update returns null', async () => {
    global.sails.helpers.labels.updateOne.with.mockResolvedValue(null);
    await expect(
      callController(updateController, { inputs: { id: 'label-1', name: 'X' } }),
    ).rejects.toMatchObject({ labelNotFound: 'Label not found' });
  });

  test('delete label success', async () => {
    const res = await callController(deleteController, { inputs: { id: 'label-1' } });
    expect(res.item).toMatchObject({ id: 'label-1' });
  });

  test('delete label labelNotFound when deletion returns null', async () => {
    global.sails.helpers.labels.deleteOne.with.mockResolvedValue(null);
    await expect(
      callController(deleteController, { inputs: { id: 'label-1' } }),
    ).rejects.toMatchObject({
      labelNotFound: 'Label not found',
    });
  });
});
