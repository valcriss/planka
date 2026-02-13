const presentConfig = require('../api/helpers/config/present-one');

const originalSails = global.sails;
const originalUser = global.User;

describe('helpers/config/present-one', () => {
  beforeEach(() => {
    global.sails = {
      config: {
        custom: {
          version: '1.2.3',
          activeUsersLimit: 42,
        },
      },
      helpers: {
        users: {
          getPersonalProjectOwnerLimit: jest.fn().mockReturnValue(3),
        },
      },
    };

    global.User = {
      Roles: {
        ADMIN: 'admin',
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
  });

  test('includes limits for admin users', () => {
    const result = presentConfig.fn({
      record: { id: 'config-1', name: 'Cfg' },
      user: { id: 'user-1', role: 'admin' },
    });

    expect(result).toEqual({
      id: 'config-1',
      name: 'Cfg',
      version: '1.2.3',
      personalProjectOwnerLimit: 3,
      activeUsersLimit: 42,
    });
  });

  test('omits activeUsersLimit for non-admin users', () => {
    const result = presentConfig.fn({
      record: { id: 'config-2' },
      user: { id: 'user-2', role: 'member' },
    });

    expect(result).toEqual({
      id: 'config-2',
      version: '1.2.3',
      personalProjectOwnerLimit: 3,
    });
  });
});
