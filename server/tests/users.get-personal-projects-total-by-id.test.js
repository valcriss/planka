const helper = require('../api/helpers/users/get-personal-projects-total-by-id');

describe('helpers/users/get-personal-projects-total-by-id', () => {
  const originalProjectManager = global.ProjectManager;
  const originalProject = global.Project;

  beforeEach(() => {
    global.ProjectManager = {
      qm: {
        getByUserId: jest.fn(),
      },
    };

    global.Project = {
      count: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();

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

  test('returns 0 when user manages no projects', async () => {
    global.ProjectManager.qm.getByUserId.mockResolvedValue([]);

    const result = await helper.fn({ id: '1' });

    expect(result).toBe(0);
    expect(global.Project.count).not.toHaveBeenCalled();
  });

  test('counts projects owned by the user project manager ids', async () => {
    const projectManagers = [{ id: '10' }, { id: '20' }];
    global.ProjectManager.qm.getByUserId.mockResolvedValue(projectManagers);
    global.Project.count.mockResolvedValue(2);

    const result = await helper.fn({ id: '1' });

    expect(result).toBe(2);
    expect(global.Project.count).toHaveBeenCalledWith({
      ownerProjectManagerId: ['10', '20'],
    });
  });
});
