const lodash = require('lodash');

const presentOne = require('../api/helpers/users/present-one');
const presentMany = require('../api/helpers/users/present-many');

const originalSails = global.sails;
const originalUser = global.User;
const originalLodash = global._;

describe('helpers/users present-one and present-many', () => {
  beforeEach(() => {
    global._ = lodash;

    global.sails = {
      config: {
        custom: {
          userAvatarsPathSegment: 'avatars',
          defaultAdminEmail: 'admin@example.com',
          oidcIgnoreRoles: false,
          oidcIgnoreUsername: false,
        },
      },
      hooks: {
        'file-manager': {
          getInstance: jest.fn().mockReturnValue({
            buildUrl: jest.fn((path) => `url:${path}`),
          }),
        },
      },
      helpers: {
        users: {
          presentOne: jest.fn(),
        },
      },
    };

    global.User = {
      Roles: {
        ADMIN: 'admin',
      },
      PRIVATE_FIELD_NAMES: ['password'],
      PERSONAL_FIELD_NAMES: ['email'],
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

    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });

  test('presents user with avatar and locks for default admin', () => {
    const record = {
      id: 'user-1',
      name: 'Admin',
      email: 'admin@example.com',
      avatar: { dirname: 'abc', extension: 'png' },
      password: 'secret',
    };

    const result = presentOne.fn({
      record,
      user: { id: 'user-1', role: 'admin' },
    });

    expect(result.avatar).toEqual({
      url: 'url:avatars/abc/original.png',
      thumbnailUrls: {
        cover180: 'url:avatars/abc/cover-180.png',
      },
    });
    expect(result.isDefaultAdmin).toBe(true);
    expect(result.lockedFieldNames).toEqual(expect.arrayContaining(['email', 'password', 'name']));
  });

  test('omits personal fields for admin viewing others', () => {
    const record = { id: 'user-2', email: 'user@example.com' };

    const result = presentOne.fn({
      record,
      user: { id: 'admin', role: 'admin' },
    });

    expect(result.email).toBeUndefined();
  });

  test('omits private and personal fields for non-admin', () => {
    const record = {
      id: 'user-3',
      email: 'user@example.com',
      password: 'secret',
    };

    const result = presentOne.fn({
      record,
      user: { id: 'other', role: 'member' },
    });

    expect(result.email).toBeUndefined();
    expect(result.password).toBeUndefined();
  });

  test('presents many via presentOne', () => {
    sails.helpers.users.presentOne.mockReturnValue({ id: 'user-1' });

    const result = presentMany.fn({
      records: [{ id: 'user-1' }],
      user: { id: 'admin', role: 'admin' },
    });

    expect(sails.helpers.users.presentOne).toHaveBeenCalledWith(
      { id: 'user-1' },
      {
        id: 'admin',
        role: 'admin',
      },
    );
    expect(result).toEqual([{ id: 'user-1' }]);
  });
});
