const lodash = require('lodash');
const createTask = require('../api/helpers/tasks/create-one');
const updateTask = require('../api/helpers/tasks/update-one');
const deleteTask = require('../api/helpers/tasks/delete-one');

const originalSails = global.sails;
const originalTask = global.Task;
const originalWebhook = global.Webhook;
const originalAction = global.Action;
const originalLodash = global._;
describe('helpers/tasks create/update/delete', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      helpers: {
        utils: {
          insertToPositionables: jest.fn().mockReturnValue({ position: 10, repositions: [] }),
          sendWebhooks: {
            with: jest.fn(),
          },
        },
        actions: {
          createOne: {
            with: jest.fn(),
          },
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };
    global.Task = {
      qm: {
        getByTaskListId: jest.fn().mockResolvedValue([]),
        createOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
    global.Action = {
      Types: {
        COMPLETE_TASK: 'complete_task',
        UNCOMPLETE_TASK: 'uncomplete_task',
      },
    };
    global.Webhook = {
      Events: {
        TASK_CREATE: 'taskCreate',
        TASK_UPDATE: 'taskUpdate',
        TASK_DELETE: 'taskDelete',
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
    if (typeof originalTask === 'undefined') {
      delete global.Task;
    } else {
      global.Task = originalTask;
    }
    if (typeof originalWebhook === 'undefined') {
      delete global.Webhook;
    } else {
      global.Webhook = originalWebhook;
    }
    if (typeof originalAction === 'undefined') {
      delete global.Action;
    } else {
      global.Action = originalAction;
    }
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('creates task and sends webhooks', async () => {
    Task.qm.createOne.mockResolvedValue({ id: 'task-1' });
    const result = await createTask.fn({
      values: { position: 1, taskList: { id: 'tl-1' } },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });
    expect(result).toEqual({ id: 'task-1' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('updates task and creates action on completion change', async () => {
    Task.qm.updateOne.mockResolvedValue({
      id: 'task-2',
      isCompleted: true,
      name: 'Task',
    });
    const result = await updateTask.fn({
      record: { id: 'task-2', isCompleted: false },
      values: { isCompleted: true },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1', name: 'Card' },
      taskList: { id: 'tl-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-2' },
    });
    expect(result).toEqual({ id: 'task-2', isCompleted: true, name: 'Task' });
    expect(sails.helpers.actions.createOne.with).toHaveBeenCalled();
  });
  test('deletes task and sends webhooks', async () => {
    Task.qm.deleteOne.mockResolvedValue({ id: 'task-3' });
    const result = await deleteTask.fn({
      record: { id: 'task-3' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1' },
      taskList: { id: 'tl-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-3' },
    });
    expect(result).toEqual({ id: 'task-3' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
});
