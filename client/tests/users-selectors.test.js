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

jest.mock('../src/constants/StaticUsers', () => ({
  STATIC_USER_BY_ID: {
    static: { id: 'static', name: 'Static User' },
  },
}));

import {
  selectCurrentUserId,
  makeSelectUserById,
  selectUsersExceptCurrent,
  selectActiveUsers,
  selectActiveUsersTotal,
  selectActiveAdminOrProjectOwnerUsers,
  selectCurrentUser,
  selectProjectIdsForCurrentUser,
  selectFilteredProjectIdsForCurrentUser,
  selectFilteredProjctIdsByGroupForCurrentUser,
  selectFavoriteProjectIdsForCurrentUser,
  selectPersonalProjectsTotalForCurrentUser,
  selectProjectsToListsWithEditorRightsForCurrentUser,
  selectBoardIdsForCurrentUser,
  selectNotificationIdsForCurrentUser,
  selectNotificationServiceIdsForCurrentUser,
  selectIsFavoritesActiveForCurrentUser,
} from '../src/selectors/users';
import {
  BoardMembershipRoles,
  ProjectGroups,
  ProjectOrders,
  UserRoles,
} from '../src/constants/Enums';

const createState = ({ models, userId = 'u1', core = {} }) => ({
  auth: { userId },
  core: {
    isFavoritesEnabled: false,
    isHiddenProjectsVisible: false,
    projectsOrder: ProjectOrders.BY_CREATION_TIME,
    projectsSearch: '',
    ...core,
  },
  models,
});

describe('users selectors', () => {
  test('selectCurrentUserId returns auth user id', () => {
    expect(selectCurrentUserId(createState({ models: {}, userId: 'abc' }))).toBe('abc');
  });

  test('makeSelectUserById handles static, regular and missing users', () => {
    const selectUserById = makeSelectUserById();
    const state = createState({
      models: {
        User: {
          withId: jest.fn((id) => (id === 'u1' ? { ref: { id: 'u1', name: 'Alice' } } : null)),
        },
      },
    });

    expect(selectUserById(state, 'static')).toEqual({ id: 'static', name: 'Static User' });
    expect(selectUserById(state, 'u1')).toEqual({ id: 'u1', name: 'Alice' });
    expect(selectUserById(state, 'missing')).toBeNull();
  });

  test('selects users lists and active admin/project-owner users', () => {
    const state = createState({
      models: {
        User: {
          getAllQuerySet: jest.fn(() => ({
            exclude: jest.fn(() => ({
              toRefArray: () => [{ id: 'u2' }],
            })),
          })),
          getActiveQuerySet: jest.fn(() => ({
            toRefArray: () => [
              { id: 'uA', role: UserRoles.ADMIN },
              { id: 'uP', role: UserRoles.PROJECT_OWNER },
              { id: 'uB', role: UserRoles.BOARD_USER },
            ],
            count: () => 3,
            filter: (predicate) => ({
              toRefArray: () =>
                [
                  { id: 'uA', role: UserRoles.ADMIN },
                  { id: 'uP', role: UserRoles.PROJECT_OWNER },
                  { id: 'uB', role: UserRoles.BOARD_USER },
                ].filter(predicate),
            }),
          })),
        },
      },
      userId: 'u1',
    });

    expect(selectUsersExceptCurrent(state)).toEqual([{ id: 'u2' }]);
    expect(selectActiveUsers(state)).toHaveLength(3);
    expect(selectActiveUsersTotal(state)).toBe(3);
    expect(selectActiveAdminOrProjectOwnerUsers(state).map((u) => u.id)).toEqual(['uA', 'uP']);
  });

  test('selectCurrentUser and selectProjectIdsForCurrentUser handle id/user guards', () => {
    const baseModels = {
      User: {
        withId: jest.fn((id) => {
          if (id === 'u1') {
            return {
              ref: { id: 'u1', name: 'Alice' },
              getProjectsModelArray: () => [{ id: 'p1' }, { id: 'p2' }],
            };
          }

          return null;
        }),
      },
    };

    expect(selectCurrentUser(createState({ models: baseModels, userId: null }))).toBeNull();
    expect(selectProjectIdsForCurrentUser(createState({ models: baseModels, userId: null }))).toBeNull();

    expect(selectCurrentUser(createState({ models: baseModels, userId: 'missing' }))).toBeNull();
    expect(selectProjectIdsForCurrentUser(createState({ models: baseModels, userId: 'missing' }))).toBeNull();

    expect(selectCurrentUser(createState({ models: baseModels, userId: 'u1' }))).toEqual({
      id: 'u1',
      name: 'Alice',
    });
    expect(selectProjectIdsForCurrentUser(createState({ models: baseModels, userId: 'u1' }))).toEqual([
      'p1',
      'p2',
    ]);
  });

  test('selectFilteredProjectIdsForCurrentUser passes filters/order and maps ids', () => {
    const getFilteredProjectsModelArray = jest.fn(() => [{ id: 'p3' }, { id: 'p4' }]);
    const state = createState({
      models: {
        User: {
          withId: jest.fn(() => ({
            getFilteredProjectsModelArray,
          })),
        },
      },
      core: {
        projectsSearch: 'abc',
        isHiddenProjectsVisible: true,
        projectsOrder: ProjectOrders.ALPHABETICALLY,
      },
    });

    expect(selectFilteredProjectIdsForCurrentUser(state)).toEqual(['p3', 'p4']);
    expect(getFilteredProjectsModelArray).toHaveBeenCalledWith('abc', true, [['name', 'id.length', 'id']]);
  });

  test('selectFilteredProjctIdsByGroupForCurrentUser groups projects correctly', () => {
    const state = createState({
      models: {
        User: {
          withId: jest.fn(() => ({
            getFilteredSeparatedProjectsModelArray: () => ({
              managerProjectModels: [
                { id: 'm1', ownerProjectManager: true },
                { id: 'm2', ownerProjectManager: false },
              ],
              membershipProjectModels: [{ id: 's1' }],
              adminProjectModels: [{ id: 'o1' }],
            }),
          })),
        },
      },
      core: {
        projectsOrder: ProjectOrders.BY_CREATION_TIME,
      },
    });

    expect(selectFilteredProjctIdsByGroupForCurrentUser(state)).toEqual({
      [ProjectGroups.MY_OWN]: ['m1'],
      [ProjectGroups.TEAM]: ['m2'],
      [ProjectGroups.SHARED_WITH_ME]: ['s1'],
      [ProjectGroups.OTHERS]: ['o1'],
    });
  });

  test('selectFavoriteProjectIdsForCurrentUser and personal project total', () => {
    const state = createState({
      models: {
        User: {
          withId: jest.fn(() => ({
            getFavoriteProjectsModelArray: jest.fn(() => [{ id: 'fp1' }]),
            projectManagers: {
              toModelArray: () => [
                {
                  id: 'pm1',
                  project: { ownerProjectManagerId: 'pm1' },
                },
                {
                  id: 'pm2',
                  project: { ownerProjectManagerId: 'pmX' },
                },
                {
                  id: 'pm3',
                  project: null,
                },
              ],
            },
          })),
        },
      },
      core: {
        projectsOrder: ProjectOrders.BY_CREATION_TIME,
      },
    });

    expect(selectFavoriteProjectIdsForCurrentUser(state)).toEqual(['fp1']);
    expect(selectPersonalProjectsTotalForCurrentUser(state)).toBe(1);
    expect(selectPersonalProjectsTotalForCurrentUser(createState({ models: state.models, userId: null }))).toBe(0);
  });

  test('selectProjectsToListsWithEditorRightsForCurrentUser returns only editor boards with persisted flags', () => {
    const editorBoard = {
      ref: { id: 'b1', name: 'Board 1' },
      getMembershipModelByUserId: () => ({ role: BoardMembershipRoles.EDITOR }),
      getListsQuerySet: () => ({
        toRefArray: () => [{ id: 'l1' }, { id: 'local:l2' }],
      }),
    };
    const viewerBoard = {
      ref: { id: 'b2', name: 'Board 2' },
      getMembershipModelByUserId: () => ({ role: BoardMembershipRoles.VIEWER }),
      getListsQuerySet: () => ({ toRefArray: () => [{ id: 'l3' }] }),
    };

    const state = createState({
      models: {
        User: {
          withId: jest.fn(() => ({
            getMembershipProjectsModelArray: () => [
              {
                ref: { id: 'p1', name: 'Project 1' },
                getBoardsModelArrayForUserWithId: () => [editorBoard, viewerBoard],
              },
            ],
          })),
        },
      },
    });

    expect(selectProjectsToListsWithEditorRightsForCurrentUser(state)).toEqual([
      {
        id: 'p1',
        name: 'Project 1',
        boards: [
          {
            id: 'b1',
            name: 'Board 1',
            lists: [
              { id: 'l1', isPersisted: true },
              { id: 'local:l2', isPersisted: false },
            ],
          },
        ],
      },
    ]);
  });

  test('selectBoardIdsForCurrentUser and notifications/service ids', () => {
    const state = createState({
      models: {
        User: {
          withId: jest.fn((id) =>
            id
              ? {
                  getProjectsModelArray: () => [
                    {
                      getBoardsModelArrayAvailableForUser: () => [{ id: 'b1' }, { id: 'b2' }],
                    },
                  ],
                  getUnreadNotificationsQuerySet: () => ({
                    toRefArray: () => [{ id: 'n1' }, { id: 'n2' }],
                  }),
                  getNotificationServicesQuerySet: () => ({
                    toRefArray: () => [{ id: 'ns1' }],
                  }),
                }
              : null,
          ),
        },
      },
    });

    expect(selectBoardIdsForCurrentUser(state)).toEqual(['b1', 'b2']);
    expect(selectNotificationIdsForCurrentUser(state)).toEqual(['n1', 'n2']);
    expect(selectNotificationServiceIdsForCurrentUser(state)).toEqual(['ns1']);

    const noIdState = createState({ models: state.models, userId: null });
    expect(selectBoardIdsForCurrentUser(noIdState)).toBeNull();
    expect(selectNotificationIdsForCurrentUser(noIdState)).toBeNull();
    expect(selectNotificationServiceIdsForCurrentUser(noIdState)).toBeNull();
  });

  test('selectIsFavoritesActiveForCurrentUser handles all guards and positive case', () => {
    const userModel = {
      getFavoriteProjectsModelArray: jest.fn(() => [{ id: 'p1' }]),
    };
    const models = {
      User: {
        withId: jest.fn((id) => (id === 'u1' ? userModel : null)),
      },
    };

    expect(
      selectIsFavoritesActiveForCurrentUser(
        createState({ models, userId: null, core: { isFavoritesEnabled: true } }),
      ),
    ).toBe(false);

    expect(
      selectIsFavoritesActiveForCurrentUser(
        createState({ models, userId: 'missing', core: { isFavoritesEnabled: true } }),
      ),
    ).toBe(false);

    expect(
      selectIsFavoritesActiveForCurrentUser(
        createState({ models, userId: 'u1', core: { isFavoritesEnabled: false } }),
      ),
    ).toBe(false);

    expect(
      selectIsFavoritesActiveForCurrentUser(
        createState({ models, userId: 'u1', core: { isFavoritesEnabled: true } }),
      ),
    ).toBe(true);
  });

  test('covers remaining guard branches for filtered/favorite/editor/board/notification selectors', () => {
    const models = {
      User: {
        withId: jest.fn((id) => (id === 'u1' ? { getFavoriteProjectsModelArray: () => [] } : null)),
      },
    };

    const noIdState = createState({ models, userId: null });
    expect(selectFilteredProjectIdsForCurrentUser(noIdState)).toBeNull();
    expect(selectFilteredProjctIdsByGroupForCurrentUser(noIdState)).toBeNull();
    expect(selectFavoriteProjectIdsForCurrentUser(noIdState)).toBeNull();
    expect(selectProjectsToListsWithEditorRightsForCurrentUser(noIdState)).toBeNull();
    expect(selectBoardIdsForCurrentUser(noIdState)).toBeNull();
    expect(selectNotificationIdsForCurrentUser(noIdState)).toBeNull();
    expect(selectNotificationServiceIdsForCurrentUser(noIdState)).toBeNull();
    expect(selectPersonalProjectsTotalForCurrentUser(noIdState)).toBe(0);

    const missingUserState = createState({ models, userId: 'missing' });
    expect(selectFilteredProjectIdsForCurrentUser(missingUserState)).toBeNull();
    expect(selectFilteredProjctIdsByGroupForCurrentUser(missingUserState)).toBeNull();
    expect(selectFavoriteProjectIdsForCurrentUser(missingUserState)).toBeNull();
    expect(selectProjectsToListsWithEditorRightsForCurrentUser(missingUserState)).toBeNull();
    expect(selectBoardIdsForCurrentUser(missingUserState)).toBeNull();
    expect(selectNotificationIdsForCurrentUser(missingUserState)).toBeNull();
    expect(selectNotificationServiceIdsForCurrentUser(missingUserState)).toBeNull();
    expect(selectPersonalProjectsTotalForCurrentUser(missingUserState)).toBe(0);
  });
});
