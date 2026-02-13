const lodash = require('lodash');

const getAllIds = require('../api/helpers/users/get-all-ids');
const getManagerProjectIds = require('../api/helpers/users/get-manager-project-ids');
const getPersonalProjectOwnerLimit = require('../api/helpers/users/get-personal-project-owner-limit');

const originalSails = global.sails;
const originalUser = global.User;
const originalProjectManager = global.ProjectManager;
const originalLodash = global._;

describe('helpers/users simple helpers', () => {
  beforeEach(() => {
    global._ = lodash;

    global.sails = {
      config: {
        custom: {},
      },
      helpers: {
        utils: {
          mapRecords: jest.fn().mockReturnValue(['id-1', 'id-2']),
        },
      },
    };

    global.User = {
      qm: {
        getAll: jest.fn().mockResolvedValue([{ id: 'id-1' }]),
      },
    };

    global.ProjectManager = {
      qm: {
        getByUserId: jest.fn().mockResolvedValue([{ projectId: 'project-1' }]),
      },
    };
  });

  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }

    if (typeof originalUser === 'undefined') {
      delete global.User;
    } else {
      global.User = originalUser;
    }

    if (typeof originalProjectManager === 'undefined') {
      delete global.ProjectManager;
    } else {
      global.ProjectManager = originalProjectManager;
    }

    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });

  test('maps user ids by role', async () => {
    const result = await getAllIds.fn({ roleOrRoles: ['admin'] });

    expect(User.qm.getAll).toHaveBeenCalledWith({ roleOrRoles: ['admin'] });
    expect(sails.helpers.utils.mapRecords).toHaveBeenCalled();
    expect(result).toEqual(['id-1', 'id-2']);
  });

  test('maps manager project ids', async () => {
    const result = await getManagerProjectIds.fn({ id: 'user-1' });

    expect(ProjectManager.qm.getByUserId).toHaveBeenCalledWith('user-1');
    expect(sails.helpers.utils.mapRecords).toHaveBeenCalledWith(
      [{ projectId: 'project-1' }],
      'projectId',
    );
    expect(result).toEqual(['id-1', 'id-2']);
  });

  test('returns personal project owner limit', () => {
    sails.config.custom.personalProjectOwnerLimit = 5;

    expect(getPersonalProjectOwnerLimit.fn()).toBe(5);

    sails.config.custom.personalProjectOwnerLimit = null;
    sails.config.custom.personnalProjectOwnerLimit = 3;

    expect(getPersonalProjectOwnerLimit.fn()).toBe(3);

    sails.config.custom.personnalProjectOwnerLimit = null;

    expect(getPersonalProjectOwnerLimit.fn()).toBeNull();
  });
});
