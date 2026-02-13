const lodash = require('lodash');
const createList = require('../api/helpers/lists/create-one');
const updateList = require('../api/helpers/lists/update-one');
const clearList = require('../api/helpers/lists/clear-one');
const deleteList = require('../api/helpers/lists/delete-one');
const moveCards = require('../api/helpers/lists/move-cards');
const sortList = require('../api/helpers/lists/sort-one');
const { POSITION_GAP } = require('../constants');

const originalSails = global.sails;
const originalList = global.List;
const originalCard = global.Card;
const originalAction = global.Action;
const originalWebhook = global.Webhook;
const originalLodash = global._;
describe('helpers/lists lifecycle', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      helpers: {
        boards: {
          getFiniteListsById: jest.fn().mockResolvedValue([]),
        },
        lists: {
          deleteRelated: jest.fn(),
          isFinite: jest.fn().mockReturnValue(false),
          isArchiveOrTrash: jest.fn().mockReturnValue(false),
        },
        utils: {
          insertToPositionables: jest.fn().mockReturnValue({ position: 10, repositions: [] }),
          sendWebhooks: {
            with: jest.fn(),
          },
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };
    global.List = {
      Types: {
        ARCHIVE: 'archive',
        TRASH: 'trash',
        CLOSED: 'closed',
      },
      SortFieldNames: {
        NAME: 'name',
        DUE_DATE: 'dueDate',
        CREATED_AT: 'createdAt',
      },
      SortOrders: {
        ASC: 'asc',
        DESC: 'desc',
      },
      qm: {
        createOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
        getOneTrashByBoardId: jest.fn().mockResolvedValue({ id: 'list-trash' }),
      },
    };
    global.Card = {
      qm: {
        update: jest.fn().mockResolvedValue([]),
        getByListId: jest.fn().mockResolvedValue([]),
        updateOne: jest.fn().mockResolvedValue({ id: 'card-1' }),
      },
    };
    global.Action = {
      Types: {
        MOVE_CARD: 'moveCard',
      },
      qm: {
        create: jest.fn().mockResolvedValue([]),
      },
    };
    global.Webhook = {
      Events: {
        LIST_CREATE: 'listCreate',
        LIST_UPDATE: 'listUpdate',
        LIST_CLEAR: 'listClear',
        LIST_DELETE: 'listDelete',
        CARD_UPDATE: 'cardUpdate',
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
    if (typeof originalList === 'undefined') {
      delete global.List;
    } else {
      global.List = originalList;
    }
    if (typeof originalCard === 'undefined') {
      delete global.Card;
    } else {
      global.Card = originalCard;
    }
    if (typeof originalAction === 'undefined') {
      delete global.Action;
    } else {
      global.Action = originalAction;
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
  test('creates list, repositions, and sends webhooks', async () => {
    sails.helpers.utils.insertToPositionables.mockReturnValue({
      position: 10,
      repositions: [
        {
          record: { id: 'list-r1', boardId: 'board-1' },
          position: 5,
        },
      ],
    });
    List.qm.createOne.mockResolvedValue({ id: 'list-1', boardId: 'board-1' });
    const result = await createList.fn({
      values: { position: 2, board: { id: 'board-1' } },
      project: { id: 'project-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });
    expect(result).toEqual({ id: 'list-1', boardId: 'board-1' });
    expect(List.qm.updateOne).toHaveBeenCalledWith(
      { id: 'list-r1', boardId: 'board-1' },
      { position: 5 },
    );
    expect(List.qm.createOne).toHaveBeenCalledWith(
      expect.objectContaining({
        boardId: 'board-1',
        cardLimit: 0,
        position: 10,
      }),
    );
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('updates list position and sends webhooks', async () => {
    sails.helpers.utils.insertToPositionables.mockReturnValue({
      position: 20,
      repositions: [
        {
          record: { id: 'list-r2', boardId: 'board-1' },
          position: 15,
        },
      ],
    });
    List.qm.updateOne.mockResolvedValue({ id: 'list-2', boardId: 'board-1' });
    const result = await updateList.fn({
      record: { id: 'list-2', boardId: 'board-1' },
      values: { position: 3 },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-2' },
    });
    expect(result).toEqual({ id: 'list-2', boardId: 'board-1' });
    expect(List.qm.updateOne).toHaveBeenCalledWith(
      { id: 'list-r2', boardId: 'board-1' },
      { position: 15 },
    );
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('skips webhooks when update returns null', async () => {
    List.qm.updateOne.mockResolvedValue(null);
    const result = await updateList.fn({
      record: { id: 'list-3', boardId: 'board-1' },
      values: { name: 'No update' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-3' },
    });
    expect(result).toBeNull();
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });
  test('clears list and sends webhooks', async () => {
    await clearList.fn({
      record: { id: 'list-4' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-4' },
    });
    expect(sails.helpers.lists.deleteRelated).toHaveBeenCalledWith({
      id: 'list-4',
    });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('deletes list and sends webhooks', async () => {
    Card.qm.update.mockResolvedValue([{ id: 'card-1' }]);
    List.qm.deleteOne.mockResolvedValue({ id: 'list-5', boardId: 'board-1' });
    const result = await deleteList.fn({
      record: { id: 'list-5', boardId: 'board-1' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-5' },
    });
    expect(result).toEqual({
      list: { id: 'list-5', boardId: 'board-1' },
      cards: [{ id: 'card-1' }],
    });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('throws when moving cards to finite list without override', async () => {
    sails.helpers.lists.isFinite.mockReturnValue(true);
    await expect(
      moveCards.fn({
        record: { id: 'list-6', type: 'open' },
        values: { list: { id: 'list-7', boardId: 'board-1' } },
        project: { id: 'project-1' },
        board: { id: 'board-1' },
        actorUser: { id: 'actor-1' },
      }),
    ).rejects.toBe('listInValuesMustBeEndless');
  });
  test('throws when moving cards to list in another board', async () => {
    await expect(
      moveCards.fn({
        record: { id: 'list-8', type: 'open' },
        values: { list: { id: 'list-9', boardId: 'board-2' } },
        project: { id: 'project-1' },
        board: { id: 'board-1' },
        actorUser: { id: 'actor-1' },
        allowFiniteList: true,
      }),
    ).rejects.toBe('listInValuesMustBelongToBoard');
  });
  test('moves cards and creates actions', async () => {
    sails.helpers.lists.isArchiveOrTrash.mockReturnValue(true);
    Card.qm.update.mockResolvedValue([{ id: 'card-2' }]);
    Action.qm.create.mockResolvedValue([{ id: 'action-1' }]);
    const result = await moveCards.fn({
      record: { id: 'list-10', type: 'open', name: 'Open' },
      values: {
        list: {
          id: 'list-11',
          boardId: 'board-1',
          type: 'archive',
          name: 'Archive',
        },
      },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-6' },
      allowFiniteList: true,
    });
    expect(result).toEqual({
      cards: [{ id: 'card-2' }],
      actions: [{ id: 'action-1' }],
    });
    expect(Card.qm.update).toHaveBeenCalledWith(
      { listId: 'list-10' },
      expect.objectContaining({
        listId: 'list-11',
        position: null,
        prevListId: 'list-10',
        listChangedAt: expect.any(String),
      }),
    );
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('sorts finite list by name', async () => {
    sails.helpers.lists.isFinite.mockReturnValue(true);
    Card.qm.getByListId.mockResolvedValue([
      { id: 'card-b', listId: 'list-12', name: 'B' },
      { id: 'card-a', listId: 'list-12', name: 'A' },
    ]);
    Card.qm.updateOne
      .mockResolvedValueOnce({ id: 'card-a', position: POSITION_GAP })
      .mockResolvedValueOnce({ id: 'card-b', position: POSITION_GAP * 2 });
    const result = await sortList.fn({
      record: { id: 'list-12', type: 'finite' },
      options: { fieldName: 'name', order: 'asc' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-7' },
    });
    expect(result).toEqual([
      { id: 'card-a', position: POSITION_GAP },
      { id: 'card-b', position: POSITION_GAP * 2 },
    ]);
    expect(Card.qm.updateOne).toHaveBeenNthCalledWith(
      1,
      { id: 'card-a', listId: 'list-12' },
      {
        position: POSITION_GAP,
      },
    );
    expect(Card.qm.updateOne).toHaveBeenNthCalledWith(
      2,
      { id: 'card-b', listId: 'list-12' },
      {
        position: POSITION_GAP * 2,
      },
    );
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('throws for invalid sort field', async () => {
    sails.helpers.lists.isFinite.mockReturnValue(true);
    await expect(
      sortList.fn({
        record: { id: 'list-13', type: 'finite' },
        options: { fieldName: 'unknown', order: 'asc' },
        project: { id: 'project-1' },
        board: { id: 'board-1' },
        actorUser: { id: 'actor-1' },
      }),
    ).rejects.toBe('invalidFieldName');
  });
});
