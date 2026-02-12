const originalSails = global.sails;
const originalUser = global.User;

const isAdminOrProjectOwnerMock = jest.fn();

global.sails = {
  helpers: {
    users: {
      isAdminOrProjectOwner: isAdminOrProjectOwnerMock,
    },
  },
};

global.User = {
  Roles: {
    ADMIN: 'admin',
    USER: 'user',
  },
  INTERNAL: {
    id: 'internal-user-id',
  },
};

const isAdmin = require('../api/policies/is-admin');
const isAdminOrProjectOwner = require('../api/policies/is-admin-or-project-owner');
const isAuthenticated = require('../api/policies/is-authenticated');
const isExternal = require('../api/policies/is-external');

const createRes = () => ({
  unauthorized: jest.fn(),
  notFound: jest.fn(),
});

describe('api policies', () => {
  beforeEach(() => {
    isAdminOrProjectOwnerMock.mockReset();
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

  test('isAuthenticated blocks missing user', async () => {
    const res = createRes();
    const proceed = jest.fn();

    await isAuthenticated({}, res, proceed);

    expect(res.unauthorized).toHaveBeenCalledWith('Access token is missing, invalid or expired');
    expect(proceed).not.toHaveBeenCalled();
  });

  test('isAuthenticated allows when user exists', async () => {
    const res = createRes();
    const proceed = jest.fn();

    await isAuthenticated({ currentUser: { id: 'user-1' } }, res, proceed);

    expect(res.unauthorized).not.toHaveBeenCalled();
    expect(proceed).toHaveBeenCalled();
  });

  test('isAdmin blocks missing user', async () => {
    const res = createRes();
    const proceed = jest.fn();

    await isAdmin({}, res, proceed);

    expect(res.unauthorized).toHaveBeenCalledWith('Access token is missing, invalid or expired');
    expect(proceed).not.toHaveBeenCalled();
  });

  test('isAdmin blocks non-admin user', async () => {
    const res = createRes();
    const proceed = jest.fn();

    await isAdmin({ currentUser: { role: User.Roles.USER } }, res, proceed);

    expect(res.notFound).toHaveBeenCalled();
    expect(proceed).not.toHaveBeenCalled();
  });

  test('isAdmin allows admin user', async () => {
    const res = createRes();
    const proceed = jest.fn();

    await isAdmin({ currentUser: { role: User.Roles.ADMIN } }, res, proceed);

    expect(res.notFound).not.toHaveBeenCalled();
    expect(proceed).toHaveBeenCalled();
  });

  test('isExternal blocks internal user', async () => {
    const res = createRes();
    const proceed = jest.fn();

    await isExternal({ currentUser: { id: User.INTERNAL.id } }, res, proceed);

    expect(res.notFound).toHaveBeenCalled();
    expect(proceed).not.toHaveBeenCalled();
  });

  test('isExternal allows non-internal user', async () => {
    const res = createRes();
    const proceed = jest.fn();

    await isExternal({ currentUser: { id: 'external-user-id' } }, res, proceed);

    expect(res.notFound).not.toHaveBeenCalled();
    expect(proceed).toHaveBeenCalled();
  });

  test('isAdminOrProjectOwner blocks when helper returns false', async () => {
    const res = createRes();
    const proceed = jest.fn();

    isAdminOrProjectOwnerMock.mockReturnValue(false);

    await isAdminOrProjectOwner({ currentUser: { id: 'user-1' } }, res, proceed);

    expect(isAdminOrProjectOwnerMock).toHaveBeenCalledWith({ id: 'user-1' });
    expect(res.notFound).toHaveBeenCalled();
    expect(proceed).not.toHaveBeenCalled();
  });

  test('isAdminOrProjectOwner allows when helper returns true', async () => {
    const res = createRes();
    const proceed = jest.fn();

    isAdminOrProjectOwnerMock.mockReturnValue(true);

    await isAdminOrProjectOwner({ currentUser: { id: 'user-2' } }, res, proceed);

    expect(isAdminOrProjectOwnerMock).toHaveBeenCalledWith({ id: 'user-2' });
    expect(res.notFound).not.toHaveBeenCalled();
    expect(proceed).toHaveBeenCalled();
  });
});
