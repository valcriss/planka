import {
  selectAccessToken,
  selectActiveUsersLimit,
  selectAuthenticateForm,
  selectConfig,
  selectIsInitializing,
  selectIsSocketDisconnected,
  selectOidcConfig,
  selectPersonalProjectOwnerLimit,
  selectProjectCreateForm,
  selectUserCreateForm,
} from '../src/selectors/common';

describe('common selectors', () => {
  const state = {
    socket: { isDisconnected: true },
    common: {
      isInitializing: false,
      config: {
        oidc: { enabled: true },
        activeUsersLimit: 25,
        personalProjectOwnerLimit: 5,
      },
    },
    auth: {
      accessToken: 'token',
    },
    ui: {
      authenticateForm: { email: 'user@example.com' },
      userCreateForm: { name: 'Jane' },
      projectCreateForm: { name: 'Roadmap' },
    },
  };

  test('reads common/auth/ui slices', () => {
    expect(selectIsSocketDisconnected(state)).toBe(true);
    expect(selectIsInitializing(state)).toBe(false);
    expect(selectConfig(state)).toEqual(state.common.config);
    expect(selectOidcConfig(state)).toEqual({ enabled: true });
    expect(selectActiveUsersLimit(state)).toBe(25);
    expect(selectAccessToken(state)).toBe('token');
    expect(selectAuthenticateForm(state)).toEqual({ email: 'user@example.com' });
    expect(selectUserCreateForm(state)).toEqual({ name: 'Jane' });
    expect(selectProjectCreateForm(state)).toEqual({ name: 'Roadmap' });
  });

  test('selectPersonalProjectOwnerLimit prefers correctly named property', () => {
    expect(selectPersonalProjectOwnerLimit(state)).toBe(5);
  });

  test('selectPersonalProjectOwnerLimit supports legacy typo key', () => {
    const legacyState = {
      common: {
        config: {
          personnalProjectOwnerLimit: 3,
        },
      },
    };

    expect(selectPersonalProjectOwnerLimit(legacyState)).toBe(3);
  });

  test('selectPersonalProjectOwnerLimit returns null when config or key is missing', () => {
    expect(selectPersonalProjectOwnerLimit({ common: { config: null } })).toBeNull();
    expect(selectPersonalProjectOwnerLimit({ common: { config: {} } })).toBeNull();
  });
});
