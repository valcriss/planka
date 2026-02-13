const getBoardIdsById = require('../api/helpers/projects/get-board-ids-by-id');
const getBoardsTotalById = require('../api/helpers/projects/get-boards-total-by-id');
const getProjectManagersTotalById = require('../api/helpers/projects/get-project-managers-total-by-id');
const getManagerUserIds = require('../api/helpers/projects/get-manager-user-ids');
const getLonelyByIds = require('../api/helpers/projects/get-lonely-by-ids');

const originalSails = global.sails;
const originalBoard = global.Board;
const originalProjectManager = global.ProjectManager;
const originalProject = global.Project;

describe('helpers/projects simple helpers', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        utils: {
          mapRecords: jest.fn().mockReturnValue(['id-1', 'id-2']),
        },
      },
    };

    global.Board = {
      qm: {
        getByProjectId: jest.fn().mockResolvedValue([{ id: 'board-1' }]),
      },
    };

    global.ProjectManager = {
      qm: {
        getByProjectId: jest.fn().mockResolvedValue([{ userId: 'user-1' }]),
        getByProjectIds: jest.fn().mockResolvedValue([{ projectId: 'project-2' }]),
      },
    };

    global.Project = {
      qm: {
        getByIds: jest.fn().mockResolvedValue([{ id: 'project-1' }]),
      },
    };
  });

  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }

    if (typeof originalBoard === 'undefined') {
      delete global.Board;
    } else {
      global.Board = originalBoard;
    }

    if (typeof originalProjectManager === 'undefined') {
      delete global.ProjectManager;
    } else {
      global.ProjectManager = originalProjectManager;
    }

    if (typeof originalProject === 'undefined') {
      delete global.Project;
    } else {
      global.Project = originalProject;
    }
  });

  test('returns board ids by project id', async () => {
    const result = await getBoardIdsById.fn({ id: 'project-1' });

    expect(Board.qm.getByProjectId).toHaveBeenCalledWith('project-1');
    expect(sails.helpers.utils.mapRecords).toHaveBeenCalled();
    expect(result).toEqual(['id-1', 'id-2']);
  });

  test('returns board count by project id', async () => {
    const result = await getBoardsTotalById.fn({ id: 'project-1' });

    expect(result).toBe(1);
  });

  test('returns project managers total', async () => {
    const result = await getProjectManagersTotalById.fn({
      id: 'project-1',
      exceptProjectManagerIdOrIds: ['pm-1'],
    });

    expect(ProjectManager.qm.getByProjectId).toHaveBeenCalledWith('project-1', {
      exceptIdOrIds: ['pm-1'],
    });
    expect(result).toBe(1);
  });

  test('returns manager user ids', async () => {
    const result = await getManagerUserIds.fn({ id: 'project-1' });

    expect(sails.helpers.utils.mapRecords).toHaveBeenCalledWith([{ userId: 'user-1' }], 'userId');
    expect(result).toEqual(['id-1', 'id-2']);
  });

  test('returns lonely projects by ids', async () => {
    sails.helpers.utils.mapRecords.mockReturnValueOnce(['project-2']);

    const result = await getLonelyByIds.fn({ ids: ['project-1', 'project-2'] });

    expect(ProjectManager.qm.getByProjectIds).toHaveBeenCalledWith(['project-1', 'project-2']);
    expect(Project.qm.getByIds).toHaveBeenCalledWith(['project-1']);
    expect(result).toEqual([{ id: 'project-1' }]);
  });
});
