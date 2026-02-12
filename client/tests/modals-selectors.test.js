jest.mock('redux-orm', () => ({
  createSelector: (...args) => {
    const projector = args[args.length - 1];
    const inputSelectors = args.slice(1, -1);

    return (state, ...params) => {
      const values = inputSelectors.map((selector) => selector(state, ...params));
      return projector(state.models, ...values);
    };
  },
}));

jest.mock('../src/orm', () => ({}));

jest.mock('../src/selectors/router', () => ({
  selectPath: (state) => state.path || {},
}));

jest.mock('../src/selectors/users', () => ({
  selectCurrentUserId: (state) => state.currentUserId,
}));

import ModalTypes from '../src/constants/ModalTypes';
import { UserRoles } from '../src/constants/Enums';
import { isCurrentModalAvailableForCurrentUser, selectCurrentModal } from '../src/selectors/modals';

const createState = ({ modal, models, currentUserId = 'u1', path = { projectId: 'p1' } }) => ({
  core: { modal: modal || null },
  models,
  currentUserId,
  path,
});

describe('modals selectors', () => {
  test('selectCurrentModal returns modal payload from core state', () => {
    const modal = { type: ModalTypes.USER_SETTINGS };
    expect(selectCurrentModal({ core: { modal } })).toEqual(modal);
  });

  test('returns true when there is no current modal', () => {
    const state = createState({
      models: {
        User: { withId: jest.fn(() => ({ role: UserRoles.BOARD_USER })) },
        Project: { withId: jest.fn() },
        Board: { withId: jest.fn() },
      },
    });

    expect(isCurrentModalAvailableForCurrentUser(state)).toBe(true);
  });

  test('handles ADMINISTRATION modal based on admin role', () => {
    const stateAdmin = createState({
      modal: { type: ModalTypes.ADMINISTRATION },
      models: {
        User: { withId: jest.fn(() => ({ role: UserRoles.ADMIN })) },
        Project: { withId: jest.fn() },
        Board: { withId: jest.fn() },
      },
    });
    const stateNonAdmin = createState({
      modal: { type: ModalTypes.ADMINISTRATION },
      models: {
        User: { withId: jest.fn(() => ({ role: UserRoles.BOARD_USER })) },
        Project: { withId: jest.fn() },
        Board: { withId: jest.fn() },
      },
    });

    expect(isCurrentModalAvailableForCurrentUser(stateAdmin)).toBe(true);
    expect(isCurrentModalAvailableForCurrentUser(stateNonAdmin)).toBe(false);
  });

  test('handles ADD_PROJECT modal based on project creation rights', () => {
    const stateAllowed = createState({
      modal: { type: ModalTypes.ADD_PROJECT },
      models: {
        User: { withId: jest.fn(() => ({ role: UserRoles.PERSONAL_PROJECT_OWNER })) },
        Project: { withId: jest.fn() },
        Board: { withId: jest.fn() },
      },
    });
    const stateDenied = createState({
      modal: { type: ModalTypes.ADD_PROJECT },
      models: {
        User: { withId: jest.fn(() => ({ role: UserRoles.BOARD_USER })) },
        Project: { withId: jest.fn() },
        Board: { withId: jest.fn() },
      },
    });

    expect(isCurrentModalAvailableForCurrentUser(stateAllowed)).toBe(true);
    expect(isCurrentModalAvailableForCurrentUser(stateDenied)).toBe(false);
  });

  test('handles PROJECT_SETTINGS modal availability', () => {
    const stateMissingProject = createState({
      modal: { type: ModalTypes.PROJECT_SETTINGS },
      models: {
        User: { withId: jest.fn(() => ({ role: UserRoles.ADMIN })) },
        Project: { withId: jest.fn(() => null) },
        Board: { withId: jest.fn() },
      },
    });
    const stateAvailableProject = createState({
      modal: { type: ModalTypes.PROJECT_SETTINGS },
      models: {
        User: { withId: jest.fn(() => ({ role: UserRoles.ADMIN })) },
        Project: {
          withId: jest.fn(() => ({
            isExternalAccessibleForUser: () => true,
          })),
        },
        Board: { withId: jest.fn() },
      },
    });

    expect(isCurrentModalAvailableForCurrentUser(stateMissingProject)).toBe(false);
    expect(isCurrentModalAvailableForCurrentUser(stateAvailableProject)).toBe(true);
  });

  test('handles BOARD_SETTINGS and BOARD_ACTIVITIES modals', () => {
    const stateBoardSettingsDenied = createState({
      modal: { type: ModalTypes.BOARD_SETTINGS, params: { id: 'b1' } },
      models: {
        User: { withId: jest.fn(() => ({ role: UserRoles.ADMIN })) },
        Project: { withId: jest.fn() },
        Board: { withId: jest.fn(() => null) },
      },
    });
    const stateBoardSettingsAllowed = createState({
      modal: { type: ModalTypes.BOARD_SETTINGS, params: { id: 'b1' } },
      models: {
        User: { withId: jest.fn(() => ({ role: UserRoles.ADMIN })) },
        Project: { withId: jest.fn() },
        Board: {
          withId: jest.fn(() => ({
            isAvailableForUser: () => true,
            project: {
              hasManagerWithUserId: () => true,
            },
          })),
        },
      },
    });
    const stateBoardActivitiesAllowed = createState({
      modal: { type: ModalTypes.BOARD_ACTIVITIES, params: { id: 'b1' } },
      models: {
        User: { withId: jest.fn(() => ({ role: UserRoles.ADMIN })) },
        Project: { withId: jest.fn() },
        Board: {
          withId: jest.fn(() => ({
            isAvailableForUser: () => true,
          })),
        },
      },
    });
    const stateBoardActivitiesDenied = createState({
      modal: { type: ModalTypes.BOARD_ACTIVITIES, params: { id: 'b1' } },
      models: {
        User: { withId: jest.fn(() => ({ role: UserRoles.ADMIN })) },
        Project: { withId: jest.fn() },
        Board: {
          withId: jest.fn(() => ({
            isAvailableForUser: () => false,
          })),
        },
      },
    });

    expect(isCurrentModalAvailableForCurrentUser(stateBoardSettingsDenied)).toBe(false);
    expect(isCurrentModalAvailableForCurrentUser(stateBoardSettingsAllowed)).toBe(true);
    expect(isCurrentModalAvailableForCurrentUser(stateBoardActivitiesAllowed)).toBe(true);
    expect(isCurrentModalAvailableForCurrentUser(stateBoardActivitiesDenied)).toBe(false);
  });

  test('returns true for unknown modal type', () => {
    const state = createState({
      modal: { type: 'UNKNOWN_MODAL' },
      models: {
        User: { withId: jest.fn(() => ({ role: UserRoles.BOARD_USER })) },
        Project: { withId: jest.fn() },
        Board: { withId: jest.fn() },
      },
    });

    expect(isCurrentModalAvailableForCurrentUser(state)).toBe(true);
  });
});
