const lodash = require('lodash');
const createTaskList = require('../api/helpers/task-lists/create-one');
const updateTaskList = require('../api/helpers/task-lists/update-one');
const deleteTaskList = require('../api/helpers/task-lists/delete-one');

const originalSails = global.sails;
const originalTaskList = global.TaskList;
const originalWebhook = global.Webhook;
const originalLodash = global._;
describe('helpers/task-lists create/update/delete', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      helpers: {
        utils: {
          insertToPositionables: jest.fn().mockReturnValue({ position: 100, repositions: [] }),
          sendWebhooks: {
            with: jest.fn(),
          },
        },
        taskLists: {
          deleteRelated: jest.fn(),
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };
    global.TaskList = {
      qm: {
        getByCardId: jest.fn().mockResolvedValue([]),
        createOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
    global.Webhook = {
      Events: {
        TASK_LIST_CREATE: 'taskListCreate',
        TASK_LIST_UPDATE: 'taskListUpdate',
        TASK_LIST_DELETE: 'taskListDelete',
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
    if (typeof originalTaskList === 'undefined') {
      delete global.TaskList;
    } else {
      global.TaskList = originalTaskList;
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
  test('creates task list and sends webhooks', async () => {
    TaskList.qm.createOne.mockResolvedValue({ id: 'tl-1' });
    const result = await createTaskList.fn({
      values: { position: 1, card: { id: 'card-1' } },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });
    expect(result).toEqual({ id: 'tl-1' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('updates task list and sends webhooks', async () => {
    TaskList.qm.updateOne.mockResolvedValue({ id: 'tl-2' });
    const result = await updateTaskList.fn({
      record: { id: 'tl-2', cardId: 'card-1' },
      values: { name: 'Updated' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-2' },
    });
    expect(result).toEqual({ id: 'tl-2' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('deletes task list and sends webhooks', async () => {
    TaskList.qm.deleteOne.mockResolvedValue({ id: 'tl-3' });
    const result = await deleteTaskList.fn({
      record: { id: 'tl-3' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-3' },
    });
    expect(result).toEqual({ id: 'tl-3' });
    expect(sails.helpers.taskLists.deleteRelated).toHaveBeenCalled();
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
});
