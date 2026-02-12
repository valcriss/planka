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

import { BoardContexts, ListTypes } from '../src/constants/Enums';
import {
  makeSelectProjectById,
  makeSelectProjectByCode,
  makeSelectBoardIdsByProjectId,
  makeSelectFirstBoardIdByProjectId,
  makeSelectNotificationsTotalByProjectId,
  makeSelectIsProjectWithIdAvailableForCurrentUser,
  makeSelectIsProjectWithIdExternalAccessibleForCurrentUser,
  selectCurrentProject,
  selectManagersForCurrentProject,
  selectManagerUserIdsForCurrentProject,
  selectMemberUserIdsForCurrentProject,
  selectBackgroundImageIdsForCurrentProject,
  selectBaseCustomFieldGroupIdsForCurrentProject,
  selectBaseCustomFieldGroupsForCurrentProject,
  selectBoardIdsForCurrentProject,
  selectIsCurrentUserManagerForCurrentProject,
} from '../src/selectors/projects';
import {
  makeSelectListById,
  makeSelectCardIdsByListId,
  makeSelectCardCountByListId,
  makeSelectIsCardLimitReachedByListId,
  makeSelectIsCardLimitBlockingByListId,
  makeSelectFilteredCardIdsByListId,
  makeSelectStoryPointsTotalByListId,
  makeSelectListIdBySlug,
  selectCurrentListId,
  selectCurrentList,
  selectFirstFiniteListId,
  selectFilteredCardIdsForCurrentList,
} from '../src/selectors/lists';

const createState = ({ models, path = {}, currentUserId = 'u1' }) => ({
  models,
  path,
  currentUserId,
});

describe('projects selectors (mocked ORM)', () => {
  const managerModel = {
    id: 'pm1',
    ref: { id: 'pm1', userId: 'u1' },
    user: { ref: { id: 'u1', name: 'Alice' } },
  };

  const boardMembershipRows = [{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u1' }];
  const boardsAvailable = [
    {
      id: 'b1',
      getUnreadNotificationsQuerySet: () => ({ count: () => 2 }),
    },
    {
      id: 'b2',
      getUnreadNotificationsQuerySet: () => ({ count: () => 3 }),
    },
  ];

  const projectModel = {
    id: 'p1',
    code: 'PROJ',
    ref: { id: 'p1', name: 'Project One' },
    getBoardsModelArrayAvailableForUser: jest.fn(() => boardsAvailable),
    isAvailableForUser: jest.fn(() => true),
    isExternalAccessibleForUser: jest.fn(() => true),
    getManagersQuerySet: jest.fn(() => ({
      toModelArray: () => [managerModel],
      toRefArray: () => [managerModel.ref],
    })),
    getBoardsQuerySet: jest.fn(() => ({
      toModelArray: () => [
        {
          getMembershipsQuerySet: () => ({
            toRefArray: () => boardMembershipRows,
          }),
        },
      ],
    })),
    getBackgroundImagesQuerySet: jest.fn(() => ({
      toRefArray: () => [{ id: 'bg1' }, { id: 'bg2' }],
    })),
    getBaseCustomFieldGroupsQuerySet: jest.fn(() => ({
      toRefArray: () => [{ id: 'cfg1' }, { id: 'local:cfg2' }],
    })),
    hasManagerWithUserId: jest.fn((userId) => userId === 'u1'),
  };

  const baseModels = {
    Project: {
      withId: jest.fn((id) => (id === 'p1' ? projectModel : null)),
      all: jest.fn(() => ({
        toModelArray: () => [projectModel],
      })),
    },
    User: {
      withId: jest.fn((id) => ({ id })),
    },
  };

  test('selects project by id/code and board ids by project/current project', () => {
    const selectProjectById = makeSelectProjectById();
    const selectProjectByCode = makeSelectProjectByCode();
    const selectBoardIdsByProjectId = makeSelectBoardIdsByProjectId();

    const state = createState({
      models: baseModels,
      path: { projectId: 'p1' },
    });

    expect(selectProjectById(state, 'p1')).toEqual({ id: 'p1', name: 'Project One' });
    expect(selectProjectById(state, 'missing')).toBeNull();
    expect(selectProjectByCode(state, 'PROJ')).toEqual({ id: 'p1', name: 'Project One' });
    expect(selectProjectByCode(state, 'MISSING')).toBeUndefined();

    expect(selectBoardIdsByProjectId(state, null)).toBeNull();
    expect(selectBoardIdsByProjectId(state, 'missing')).toBeNull();
    expect(selectBoardIdsByProjectId(state, 'p1')).toEqual(['b1', 'b2']);
    expect(selectBoardIdsForCurrentProject(state)).toEqual(['b1', 'b2']);
  });

  test('selects first board id, notifications total and availability flags', () => {
    const selectFirstBoardIdByProjectId = makeSelectFirstBoardIdByProjectId();
    const selectNotificationsTotalByProjectId = makeSelectNotificationsTotalByProjectId();
    const selectIsProjectWithIdAvailableForCurrentUser =
      makeSelectIsProjectWithIdAvailableForCurrentUser();
    const selectIsProjectWithIdExternalAccessibleForCurrentUser =
      makeSelectIsProjectWithIdExternalAccessibleForCurrentUser();

    const state = createState({
      models: baseModels,
    });

    expect(selectFirstBoardIdByProjectId(state, 'p1')).toBe('b1');
    expect(selectFirstBoardIdByProjectId(state, 'missing')).toBeNull();
    expect(selectNotificationsTotalByProjectId(state, 'p1')).toBe(5);
    expect(selectNotificationsTotalByProjectId(state, 'missing')).toBeNull();
    expect(selectIsProjectWithIdAvailableForCurrentUser(state, 'p1')).toBe(true);
    expect(selectIsProjectWithIdAvailableForCurrentUser(state, 'missing')).toBe(false);
    expect(selectIsProjectWithIdExternalAccessibleForCurrentUser(state, 'p1')).toBe(true);
    expect(selectIsProjectWithIdExternalAccessibleForCurrentUser(state, 'missing')).toBe(false);
  });

  test('selects current project, managers, members and project assets', () => {
    const state = createState({
      models: baseModels,
      path: { projectId: 'p1' },
    });

    expect(selectCurrentProject(state)).toEqual({ id: 'p1', name: 'Project One' });
    expect(selectManagersForCurrentProject(state)).toEqual([
      {
        id: 'pm1',
        userId: 'u1',
        isPersisted: true,
        user: { id: 'u1', name: 'Alice' },
      },
    ]);
    expect(selectManagerUserIdsForCurrentProject(state)).toEqual(['u1']);
    expect(selectMemberUserIdsForCurrentProject(state)).toEqual(['u1', 'u2']);
    expect(selectBackgroundImageIdsForCurrentProject(state)).toEqual(['bg1', 'bg2']);
    expect(selectBaseCustomFieldGroupIdsForCurrentProject(state)).toEqual(['cfg1', 'local:cfg2']);
    expect(selectBaseCustomFieldGroupsForCurrentProject(state)).toEqual([
      { id: 'cfg1', isPersisted: true },
      { id: 'local:cfg2', isPersisted: false },
    ]);
    expect(selectIsCurrentUserManagerForCurrentProject(state)).toBe(true);
  });

  test('returns null/false when current project path id is missing', () => {
    const state = createState({
      models: baseModels,
      path: {},
    });

    expect(selectCurrentProject(state)).toBeUndefined();
    expect(selectManagersForCurrentProject(state)).toBeUndefined();
    expect(selectManagerUserIdsForCurrentProject(state)).toBeUndefined();
    expect(selectMemberUserIdsForCurrentProject(state)).toBeUndefined();
    expect(selectBackgroundImageIdsForCurrentProject(state)).toBeUndefined();
    expect(selectBaseCustomFieldGroupIdsForCurrentProject(state)).toBeUndefined();
    expect(selectBaseCustomFieldGroupsForCurrentProject(state)).toBeUndefined();
    expect(selectBoardIdsForCurrentProject(state)).toBeUndefined();
    expect(selectIsCurrentUserManagerForCurrentProject(state)).toBe(false);
  });

  test('returns null/false when current project id exists in path but model is missing', () => {
    const state = createState({
      models: baseModels,
      path: { projectId: 'missing' },
    });

    expect(selectCurrentProject(state)).toBeNull();
    expect(selectManagersForCurrentProject(state)).toBeNull();
    expect(selectManagerUserIdsForCurrentProject(state)).toBeNull();
    expect(selectMemberUserIdsForCurrentProject(state)).toBeNull();
    expect(selectBackgroundImageIdsForCurrentProject(state)).toBeNull();
    expect(selectBaseCustomFieldGroupIdsForCurrentProject(state)).toBeNull();
    expect(selectBaseCustomFieldGroupsForCurrentProject(state)).toBeNull();
    expect(selectBoardIdsForCurrentProject(state)).toBeNull();
    expect(selectIsCurrentUserManagerForCurrentProject(state)).toBe(false);
  });
});

describe('lists selectors (mocked ORM)', () => {
  const listModel = {
    id: 'l1',
    ref: { id: 'l1', slug: 'todo' },
    cardLimit: 3,
    getCardsModelArray: jest.fn(() => [{ id: 'c1' }, { id: 'c2' }]),
    getFilteredCardsModelArray: jest.fn(() => [{ id: 'c2', storyPoints: 5 }, { id: 'c3', storyPoints: 8 }]),
  };

  const boardModel = {
    context: ListTypes.ACTIVE,
    lists: {
      filter: jest.fn(() => ({
        first: () => listModel,
      })),
    },
    getFiniteListsQuerySet: jest.fn(() => ({
      first: () => ({ id: 'l-finite' }),
    })),
  };

  const models = {
    List: {
      withId: jest.fn((id) => (id === 'l1' ? listModel : null)),
      all: jest.fn(() => ({
        filter: jest.fn(({ slug }) => ({
          first: () => (slug === 'todo' ? { id: 'l1' } : null),
        })),
      })),
    },
    Board: {
      withId: jest.fn((id) => (id === 'b1' ? boardModel : null)),
    },
  };

  test('selects list details and derived data by id/slug', () => {
    const selectListById = makeSelectListById();
    const selectCardIdsByListId = makeSelectCardIdsByListId();
    const selectStoryPointsTotalByListId = makeSelectStoryPointsTotalByListId();
    const selectListIdBySlug = makeSelectListIdBySlug();
    const state = createState({ models });

    expect(selectListById(state, 'l1')).toEqual({ id: 'l1', slug: 'todo', isPersisted: true });
    expect(selectListById(state, 'local:l1')).toBeNull();
    expect(selectCardIdsByListId(state, 'l1')).toEqual(['c1', 'c2']);
    expect(selectCardIdsByListId(state, 'missing')).toBeNull();
    expect(selectStoryPointsTotalByListId(state, 'l1')).toBe(13);
    expect(selectStoryPointsTotalByListId(state, 'missing')).toBeNull();
    expect(selectListIdBySlug(state, 'todo')).toBe('l1');
    expect(selectListIdBySlug(state, 'missing')).toBeNull();

    const selectCardCountByListId = makeSelectCardCountByListId();
    const selectIsCardLimitReachedByListId = makeSelectIsCardLimitReachedByListId();
    const selectIsCardLimitBlockingByListId = makeSelectIsCardLimitBlockingByListId();
    const selectFilteredCardIdsByListId = makeSelectFilteredCardIdsByListId();

    expect(selectCardCountByListId(state, 'missing')).toBeNull();
    expect(selectIsCardLimitReachedByListId(state, 'missing')).toBeNull();
    expect(selectIsCardLimitBlockingByListId(state, 'missing')).toBeNull();
    expect(selectFilteredCardIdsByListId(state, 'missing')).toBeNull();
  });

  test('selects current list id/current list/first finite list and filtered card ids', () => {
    const state = createState({
      models,
      path: { boardId: 'b1' },
    });

    expect(selectCurrentListId(state)).toBe('l1');
    expect(selectCurrentList(state)).toEqual({ id: 'l1', slug: 'todo' });
    expect(selectFirstFiniteListId(state)).toBe('l-finite');
    expect(selectFilteredCardIdsForCurrentList(state)).toEqual(['c2', 'c3']);
  });

  test('covers selectCurrentListId branches for missing board and board context', () => {
    const missingBoardState = createState({
      models,
      path: { boardId: 'missing' },
    });
    expect(selectCurrentListId(missingBoardState)).toBeNull();
    expect(selectFirstFiniteListId(missingBoardState)).toBeNull();

    const boardContextState = createState({
      models: {
        ...models,
        Board: {
          withId: jest.fn(() => ({
            context: BoardContexts.BOARD,
          })),
        },
      },
      path: { boardId: 'b1' },
    });
    expect(selectCurrentListId(boardContextState)).toBeNull();

    const noBoardIdState = createState({
      models,
      path: {},
    });
    expect(selectCurrentListId(noBoardIdState)).toBeUndefined();
    expect(selectCurrentList(noBoardIdState)).toBeUndefined();
    expect(selectFirstFiniteListId(noBoardIdState)).toBeUndefined();
    expect(selectFilteredCardIdsForCurrentList(noBoardIdState)).toBeUndefined();

    const missingCurrentListState = createState({
      models: {
        ...models,
        List: {
          ...models.List,
          withId: jest.fn(() => null),
        },
      },
      path: { boardId: 'b1' },
    });
    expect(selectCurrentList(missingCurrentListState)).toBeNull();
    expect(selectFilteredCardIdsForCurrentList(missingCurrentListState)).toBeNull();
  });

  test('uses ACTIVE context fallback when board context is not set', () => {
    const filter = jest.fn(() => ({
      first: () => ({ id: 'l-active' }),
    }));
    const state = createState({
      models: {
        ...models,
        Board: {
          withId: jest.fn(() => ({
            context: undefined,
            lists: {
              filter,
            },
          })),
        },
      },
      path: { boardId: 'b1' },
    });

    expect(selectCurrentListId(state)).toBe('l-active');
    expect(filter).toHaveBeenCalledWith({ type: ListTypes.ACTIVE });
  });
});
