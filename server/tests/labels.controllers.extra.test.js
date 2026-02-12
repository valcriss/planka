const originalSails = global.sails;
const originalBoardMembership = global.BoardMembership;
const originalLabel = global.Label;
const originalLodash = global._;

const makeInterceptable = (value, codeToThrow) => ({
  intercept(code, handler) {
    if (code === codeToThrow) {
      throw handler();
    }

    return value;
  },
});

describe('labels controllers extra branches', () => {
  let createController;
  let updateController;
  let deleteController;

  beforeEach(() => {
    global._ = require('lodash'); // eslint-disable-line global-require

    global.Label = {
      COLORS: ['berry-red', 'lagoon-blue'],
    };

    global.sails = {
      helpers: {
        boards: {
          getPathToProjectById: jest.fn(),
        },
        labels: {
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

    // eslint-disable-next-line global-require
    createController = require('../api/controllers/labels/create');
    // eslint-disable-next-line global-require
    updateController = require('../api/controllers/labels/update');
    // eslint-disable-next-line global-require
    deleteController = require('../api/controllers/labels/delete');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.BoardMembership = originalBoardMembership;
    global.Label = originalLabel;
    global._ = originalLodash;
  });

  test('labels/create returns boardNotFound on path not found', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable({}, 'pathNotFound'),
    );

    await expect(
      createController.fn.call({ req }, { boardId: 'b1', position: 0, color: 'berry-red' }),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('labels/update and labels/delete enforce not-found and rights branches', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.labels.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(updateController.fn.call({ req }, { id: 'lb1', name: 'X' })).rejects.toEqual({
      labelNotFound: 'Label not found',
    });

    sails.helpers.labels.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        label: { id: 'lb1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(updateController.fn.call({ req }, { id: 'lb1', name: 'X' })).rejects.toEqual({
      labelNotFound: 'Label not found',
    });

    sails.helpers.labels.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        label: { id: 'lb1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(updateController.fn.call({ req }, { id: 'lb1', name: 'X' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.labels.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(deleteController.fn.call({ req }, { id: 'lb1' })).rejects.toEqual({
      labelNotFound: 'Label not found',
    });

    sails.helpers.labels.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        label: { id: 'lb1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(deleteController.fn.call({ req }, { id: 'lb1' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });
});
