const createController = require('../api/controllers/tasks/create');
const deleteController = require('../api/controllers/tasks/delete');
const updateController = require('../api/controllers/tasks/update');

const originalSails = global.sails;
const originalBoardMembership = global.BoardMembership;
const originalTaskList = global.TaskList;
const originalLodash = global._;

const makeInterceptable = (value, codeToThrow) => ({
  intercept(code, handler) {
    if (code === codeToThrow) {
      throw handler();
    }

    return value;
  },
});

describe('tasks controllers', () => {
  beforeEach(() => {
    global._ = require('lodash'); // eslint-disable-line global-require

    global.sails = {
      helpers: {
        taskLists: {
          getPathToProjectById: jest.fn(),
        },
        tasks: {
          getPathToProjectById: jest.fn(),
          createOne: {
            with: jest.fn(),
          },
          updateOne: {
            with: jest.fn(),
          },
          deleteOne: {
            with: jest.fn(),
          },
        },
        users: {
          isBoardMember: jest.fn(),
        },
      },
    };

    global.BoardMembership = {
      Roles: {
        EDITOR: 'editor',
      },
      qm: {
        getOneByBoardIdAndUserId: jest.fn(),
      },
    };

    global.TaskList = {
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
    global.BoardMembership = originalBoardMembership;
    global.TaskList = originalTaskList;
    global._ = originalLodash;
  });

  test('tasks/create handles path and rights checks', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.taskLists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(
      createController.fn.call({ req }, { taskListId: 'tl1', position: 0, name: 'Task' }),
    ).rejects.toEqual({
      taskListNotFound: 'Task list not found',
    });

    sails.helpers.taskLists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(
      createController.fn.call({ req }, { taskListId: 'tl1', position: 0, name: 'Task' }),
    ).rejects.toEqual({
      taskListNotFound: 'Task list not found',
    });

    sails.helpers.taskLists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(
      createController.fn.call({ req }, { taskListId: 'tl1', position: 0, name: 'Task' }),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('tasks/create creates task', async () => {
    const req = { currentUser: { id: 'u1' } };
    const created = { id: 't1' };

    sails.helpers.taskLists.getPathToProjectById.mockReturnValue(
      makeInterceptable({
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({ role: 'editor' });
    sails.helpers.tasks.createOne.with.mockResolvedValue(created);

    const result = await createController.fn.call(
      { req },
      { taskListId: 'tl1', position: 1, name: 'Task', isCompleted: false },
    );

    expect(result).toEqual({ item: created });
  });

  test('tasks/update handles path and rights checks', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.tasks.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(updateController.fn.call({ req }, { id: 't1' })).rejects.toEqual({
      taskNotFound: 'Task not found',
    });

    sails.helpers.tasks.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        task: { id: 't1' },
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(updateController.fn.call({ req }, { id: 't1' })).rejects.toEqual({
      taskNotFound: 'Task not found',
    });

    sails.helpers.tasks.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        task: { id: 't1' },
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(updateController.fn.call({ req }, { id: 't1' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('tasks/update handles task list and assignee errors', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.tasks.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        task: { id: 't1' },
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    TaskList.qm.getOneById.mockResolvedValueOnce(null);
    await expect(
      updateController.fn.call({ req }, { id: 't1', taskListId: 'tl2' }),
    ).rejects.toEqual({
      taskListNotFound: 'Task list not found',
    });

    sails.helpers.tasks.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        task: { id: 't1' },
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.users.isBoardMember.mockResolvedValueOnce(false);
    await expect(
      updateController.fn.call({ req }, { id: 't1', assigneeUserId: 'u2' }),
    ).rejects.toEqual({
      userNotFound: 'User not found',
    });
  });

  test('tasks/update rejects missing update result', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.tasks.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        task: { id: 't1' },
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.tasks.updateOne.with.mockResolvedValueOnce(null);

    await expect(updateController.fn.call({ req }, { id: 't1' })).rejects.toEqual({
      taskNotFound: 'Task not found',
    });
  });

  test('tasks/update updates task', async () => {
    const req = { currentUser: { id: 'u1' } };
    const nextTaskList = { id: 'tl2' };
    const updated = { id: 't1', name: 'Renamed' };

    sails.helpers.tasks.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        task: { id: 't1' },
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    TaskList.qm.getOneById.mockResolvedValueOnce(nextTaskList);
    sails.helpers.users.isBoardMember.mockResolvedValueOnce(true);
    sails.helpers.tasks.updateOne.with.mockResolvedValueOnce(updated);

    const result = await updateController.fn.call(
      { req },
      {
        id: 't1',
        taskListId: 'tl2',
        assigneeUserId: 'u2',
        position: 2,
        name: 'Renamed',
        isCompleted: true,
      },
    );

    expect(result).toEqual({ item: updated });
    expect(sails.helpers.tasks.updateOne.with).toHaveBeenCalledWith(
      expect.objectContaining({
        values: {
          assigneeUserId: 'u2',
          position: 2,
          name: 'Renamed',
          isCompleted: true,
          taskList: nextTaskList,
        },
      }),
    );
  });

  test('tasks/delete handles path, rights, and missing delete result', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.tasks.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(deleteController.fn.call({ req }, { id: 't1' })).rejects.toEqual({
      taskNotFound: 'Task not found',
    });

    sails.helpers.tasks.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        task: { id: 't1' },
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(deleteController.fn.call({ req }, { id: 't1' })).rejects.toEqual({
      taskNotFound: 'Task not found',
    });

    sails.helpers.tasks.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        task: { id: 't1' },
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(deleteController.fn.call({ req }, { id: 't1' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.tasks.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        task: { id: 't1' },
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.tasks.deleteOne.with.mockResolvedValueOnce(null);
    await expect(deleteController.fn.call({ req }, { id: 't1' })).rejects.toEqual({
      taskNotFound: 'Task not found',
    });
  });

  test('tasks/delete deletes task', async () => {
    const req = { currentUser: { id: 'u1' } };
    const task = { id: 't1' };

    sails.helpers.tasks.getPathToProjectById.mockReturnValue(
      makeInterceptable({
        task,
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({ role: 'editor' });
    sails.helpers.tasks.deleteOne.with.mockResolvedValue(task);

    const result = await deleteController.fn.call({ req }, { id: 't1' });
    expect(result).toEqual({ item: task });
  });
});
