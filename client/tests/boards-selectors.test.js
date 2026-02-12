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

import { ListTypes } from '../src/constants/Enums';
import {
  makeSelectBoardById,
  makeSelectCurrentUserMembershipByBoardId,
  makeSelectNotificationsTotalByBoardId,
  makeSelectNotificationServiceIdsByBoardId,
  selectIsBoardWithIdAvailableForCurrentUser,
  selectCurrentBoard,
  selectMembershipsForCurrentBoard,
  selectMemberUserIdsForCurrentBoard,
  selectCurrentUserMembershipForCurrentBoard,
  selectLabelsForCurrentBoard,
  selectArchiveListIdForCurrentBoard,
  selectTrashListIdForCurrentBoard,
  makeSelectListIdBySlugForCurrentBoard,
  makeSelectBoardIdByProjectIdAndSlug,
  selectFiniteListIdsForCurrentBoard,
  makeSelectFiniteListIdsByBoardId,
  makeSelectListIdByTypeByBoardId,
  selectAvailableListsForCurrentBoard,
  selectFilteredCardIdsForCurrentBoard,
  selectFilteredCardsGroupedByDueDayForCurrentBoard,
  selectCustomFieldGroupIdsForCurrentBoard,
  selectCustomFieldGroupsForCurrentBoard,
  selectActivityIdsForCurrentBoard,
  selectFilterUserIdsForCurrentBoard,
  selectFilterLabelIdsForCurrentBoard,
  selectIsBoardWithIdExists,
} from '../src/selectors/boards';

const createState = ({ models, path = {}, currentUserId = 'u1' }) => ({
  models,
  path,
  currentUserId,
});

describe('boards selectors', () => {
  const membership1 = {
    id: 'bm1',
    ref: { id: 'bm1', role: 'editor' },
    user: { id: 'u1', ref: { id: 'u1', name: 'Alice' } },
  };
  const membership2 = {
    id: 'local:bm2',
    ref: { id: 'local:bm2', role: 'viewer' },
    user: { id: 'u2', ref: { id: 'u2', name: 'Bob' } },
  };

  const boardModel = {
    id: 'b1',
    slug: 'board-a',
    projectId: 'p1',
    ref: { id: 'b1', name: 'Board A' },
    isAvailableForUser: jest.fn(() => true),
    getMembershipModelByUserId: jest.fn((userId) => (userId === 'u1' ? membership1 : null)),
    getUnreadNotificationsQuerySet: jest.fn(() => ({ count: () => 2 })),
    getNotificationServicesQuerySet: jest.fn(() => ({ toRefArray: () => [{ id: 'ns1' }, { id: 'ns2' }] })),
    getMembershipsQuerySet: jest.fn(() => ({ toModelArray: () => [membership1, membership2] })),
    getLabelsQuerySet: jest.fn(() => ({ toRefArray: () => [{ id: 'lb1' }, { id: 'lb2' }] })),
    lists: {
      filter: jest.fn(({ type, slug }) => ({
        first: () => {
          if (type === ListTypes.ARCHIVE) {
            return { id: 'la' };
          }
          if (type === ListTypes.TRASH) {
            return { id: 'lt' };
          }
          if (type === ListTypes.ACTIVE) {
            return { id: 'l-active' };
          }
          if (slug === 'todo') {
            return { id: 'l1' };
          }
          return null;
        },
      })),
    },
    getFiniteListsQuerySet: jest.fn(() => ({ toRefArray: () => [{ id: 'l1' }, { id: 'l2' }] })),
    getListsQuerySet: jest.fn(() => ({
      toRefArray: () => [
        { id: 'l1', type: ListTypes.ACTIVE },
        { id: 'la', type: ListTypes.ARCHIVE },
        { id: 'lt', type: ListTypes.TRASH },
      ],
    })),
    getFilteredCardsModelArray: jest.fn(() => [
      { id: 'c1', ref: { dueDate: '2025-10-04T12:00:00.000Z' } },
      { id: 'c2', ref: { dueDate: new Date('2025-10-04T15:00:00.000Z') } },
      { id: 'c3', ref: { dueDate: '2025-10-05T10:00:00.000Z' } },
      { id: 'c4', ref: { dueDate: 'not-a-date' } },
      { id: 'c5', ref: { dueDate: null } },
    ]),
    getCustomFieldGroupsQuerySet: jest.fn(() => ({
      toRefArray: () => [{ id: 'cfg1' }, { id: 'cfg2' }],
      toModelArray: () => [
        { ref: { id: 'cfg1', name: '' }, name: '', baseCustomFieldGroup: { name: 'Base Group 1' } },
        { ref: { id: 'cfg2', name: 'Board Group' }, name: 'Board Group', baseCustomFieldGroup: { name: 'Ignored' } },
      ],
    })),
    getActivitiesModelArray: jest.fn(() => [{ id: 'a1' }, { id: 'a2' }]),
    filterUsers: { toRefArray: () => [{ id: 'u1' }, { id: 'u2' }] },
    filterLabels: { toRefArray: () => [{ id: 'lb1' }] },
  };

  const models = {
    Board: {
      withId: jest.fn((id) => {
        if (id === 'b1' || id === 'local:b1') {
          return {
            ...boardModel,
            id,
            ref: { ...boardModel.ref, id },
          };
        }

        return null;
      }),
      idExists: jest.fn((id) => id === 'b1'),
    },
    Project: {
      withId: jest.fn((projectId) =>
        projectId === 'p1'
          ? {
              getBoardsModelArrayAvailableForUser: () => [boardModel],
            }
          : null,
      ),
    },
    User: {
      withId: jest.fn((id) => ({ id })),
    },
  };

  test('board by id, membership, notifications and availability selectors', () => {
    const selectBoardById = makeSelectBoardById();
    const selectMembershipByBoardId = makeSelectCurrentUserMembershipByBoardId();
    const selectNotificationsTotalByBoardId = makeSelectNotificationsTotalByBoardId();
    const selectNotificationServiceIdsByBoardId = makeSelectNotificationServiceIdsByBoardId();

    const state = createState({ models });

    expect(selectBoardById(state, 'b1')).toEqual({ id: 'b1', name: 'Board A', isPersisted: true });
    expect(selectBoardById(state, 'local:b1')).toEqual({
      id: 'local:b1',
      name: 'Board A',
      isPersisted: false,
    });
    expect(selectBoardById(state, 'missing')).toBeNull();

    expect(selectMembershipByBoardId(state, null)).toBeNull();
    expect(selectMembershipByBoardId(state, 'missing')).toBeNull();
    expect(selectMembershipByBoardId(state, 'b1')).toEqual({ id: 'bm1', role: 'editor' });
    expect(selectMembershipByBoardId(createState({ models, currentUserId: 'uX' }), 'b1')).toBeNull();

    expect(selectNotificationsTotalByBoardId(state, 'b1')).toBe(2);
    expect(selectNotificationsTotalByBoardId(state, 'missing')).toBeNull();

    expect(selectNotificationServiceIdsByBoardId(state, 'b1')).toEqual(['ns1', 'ns2']);
    expect(selectNotificationServiceIdsByBoardId(state, 'missing')).toBeNull();

    expect(selectIsBoardWithIdAvailableForCurrentUser(state, 'b1')).toBe(true);
    expect(selectIsBoardWithIdAvailableForCurrentUser(state, 'missing')).toBe(false);
  });

  test('current board selectors expose memberships, labels and list ids', () => {
    const state = createState({ models, path: { boardId: 'b1' } });

    expect(selectCurrentBoard(state)).toEqual({ id: 'b1', name: 'Board A' });
    expect(selectMembershipsForCurrentBoard(state)).toEqual([
      {
        id: 'bm1',
        role: 'editor',
        isPersisted: true,
        user: { id: 'u1', name: 'Alice' },
      },
      {
        id: 'local:bm2',
        role: 'viewer',
        isPersisted: false,
        user: { id: 'u2', name: 'Bob' },
      },
    ]);
    expect(selectMemberUserIdsForCurrentBoard(state)).toEqual(['u1', 'u2']);
    expect(selectCurrentUserMembershipForCurrentBoard(state)).toEqual({ id: 'bm1', role: 'editor' });
    expect(selectLabelsForCurrentBoard(state)).toEqual([{ id: 'lb1' }, { id: 'lb2' }]);
    expect(selectArchiveListIdForCurrentBoard(state)).toBe('la');
    expect(selectTrashListIdForCurrentBoard(state)).toBe('lt');
  });

  test('slug/type/finite list selectors and board id by project+slug', () => {
    const selectListIdBySlugForCurrentBoard = makeSelectListIdBySlugForCurrentBoard();
    const selectBoardIdByProjectIdAndSlug = makeSelectBoardIdByProjectIdAndSlug();
    const selectFiniteListIdsByBoardId = makeSelectFiniteListIdsByBoardId();
    const selectListIdByTypeByBoardId = makeSelectListIdByTypeByBoardId();

    const state = createState({ models, path: { boardId: 'b1' } });

    expect(selectListIdBySlugForCurrentBoard(state, 'todo')).toBe('l1');
    expect(selectListIdBySlugForCurrentBoard(state, 'missing')).toBeNull();
    expect(selectListIdBySlugForCurrentBoard(createState({ models, path: {} }), 'todo')).toBeUndefined();
    expect(
      selectListIdBySlugForCurrentBoard(createState({ models, path: { boardId: 'missing' } }), 'todo'),
    ).toBeNull();

    expect(selectBoardIdByProjectIdAndSlug(state, 'p1', 'board-a')).toBe('b1');
    expect(selectBoardIdByProjectIdAndSlug(state, 'p1', 'missing')).toBeUndefined();
    expect(selectBoardIdByProjectIdAndSlug(state, 'missing', 'board-a')).toBeNull();

    expect(selectFiniteListIdsForCurrentBoard(state)).toEqual(['l1', 'l2']);
    expect(selectFiniteListIdsByBoardId(state, null)).toBeNull();
    expect(selectFiniteListIdsByBoardId(state, 'b1')).toEqual(['l1', 'l2']);
    expect(selectFiniteListIdsByBoardId(state, 'missing')).toBeNull();

    expect(selectListIdByTypeByBoardId(state, 'b1', ListTypes.ACTIVE)).toBe('l-active');
    expect(selectListIdByTypeByBoardId(state, null, ListTypes.ACTIVE)).toBeNull();
    expect(selectListIdByTypeByBoardId(state, 'missing', ListTypes.ACTIVE)).toBeNull();
  });

  test('available lists, filtered cards, grouped due day and other ids', () => {
    const state = createState({ models, path: { boardId: 'b1' } });

    expect(selectAvailableListsForCurrentBoard(state)).toEqual([{ id: 'l1', type: ListTypes.ACTIVE }]);
    expect(selectFilteredCardIdsForCurrentBoard(state)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    expect(selectFilteredCardsGroupedByDueDayForCurrentBoard(state)).toEqual({
      '2025-10-04': ['c1', 'c2'],
      '2025-10-05': ['c3'],
    });

    expect(selectCustomFieldGroupIdsForCurrentBoard(state)).toEqual(['cfg1', 'cfg2']);
    expect(selectCustomFieldGroupsForCurrentBoard(state)).toEqual([
      { id: 'cfg1', name: 'Base Group 1' },
      { id: 'cfg2', name: 'Board Group' },
    ]);
    expect(selectActivityIdsForCurrentBoard(state)).toEqual(['a1', 'a2']);
    expect(selectFilterUserIdsForCurrentBoard(state)).toEqual(['u1', 'u2']);
    expect(selectFilterLabelIdsForCurrentBoard(state)).toEqual(['lb1']);

    expect(selectIsBoardWithIdExists(state, 'b1')).toBe(true);
    expect(selectIsBoardWithIdExists(state, 'other')).toBe(false);
  });

  test('guards for missing board id and missing board model on current-board selectors', () => {
    const noIdState = createState({ models, path: {} });

    expect(selectCurrentBoard(noIdState)).toBeUndefined();
    expect(selectMembershipsForCurrentBoard(noIdState)).toBeUndefined();
    expect(selectMemberUserIdsForCurrentBoard(noIdState)).toBeUndefined();
    expect(selectCurrentUserMembershipForCurrentBoard(noIdState)).toBeUndefined();
    expect(selectLabelsForCurrentBoard(noIdState)).toBeUndefined();
    expect(selectArchiveListIdForCurrentBoard(noIdState)).toBeUndefined();
    expect(selectTrashListIdForCurrentBoard(noIdState)).toBeUndefined();
    expect(selectFiniteListIdsForCurrentBoard(noIdState)).toBeUndefined();
    expect(selectAvailableListsForCurrentBoard(noIdState)).toBeUndefined();
    expect(selectFilteredCardIdsForCurrentBoard(noIdState)).toBeUndefined();
    expect(selectFilteredCardsGroupedByDueDayForCurrentBoard(noIdState)).toBeUndefined();
    expect(selectCustomFieldGroupIdsForCurrentBoard(noIdState)).toBeUndefined();
    expect(selectCustomFieldGroupsForCurrentBoard(noIdState)).toBeUndefined();
    expect(selectActivityIdsForCurrentBoard(noIdState)).toBeUndefined();
    expect(selectFilterUserIdsForCurrentBoard(noIdState)).toBeUndefined();
    expect(selectFilterLabelIdsForCurrentBoard(noIdState)).toBeUndefined();

    expect(selectCurrentUserMembershipForCurrentBoard(createState({ models, path: { boardId: 'b1' }, currentUserId: 'uX' }))).toBeNull();

    const missingBoardState = createState({ models, path: { boardId: 'missing' } });
    expect(selectCurrentBoard(missingBoardState)).toBeNull();
    expect(selectMembershipsForCurrentBoard(missingBoardState)).toBeNull();
    expect(selectMemberUserIdsForCurrentBoard(missingBoardState)).toBeNull();
    expect(selectCurrentUserMembershipForCurrentBoard(missingBoardState)).toBeNull();
    expect(selectLabelsForCurrentBoard(missingBoardState)).toBeNull();
    expect(selectArchiveListIdForCurrentBoard(missingBoardState)).toBeNull();
    expect(selectTrashListIdForCurrentBoard(missingBoardState)).toBeNull();
    expect(selectFiniteListIdsForCurrentBoard(missingBoardState)).toBeNull();
    expect(selectAvailableListsForCurrentBoard(missingBoardState)).toBeNull();
    expect(selectFilteredCardIdsForCurrentBoard(missingBoardState)).toBeNull();
    expect(selectFilteredCardsGroupedByDueDayForCurrentBoard(missingBoardState)).toBeNull();
    expect(selectCustomFieldGroupIdsForCurrentBoard(missingBoardState)).toBeNull();
    expect(selectCustomFieldGroupsForCurrentBoard(missingBoardState)).toBeNull();
    expect(selectActivityIdsForCurrentBoard(missingBoardState)).toBeNull();
    expect(selectFilterUserIdsForCurrentBoard(missingBoardState)).toBeNull();
    expect(selectFilterLabelIdsForCurrentBoard(missingBoardState)).toBeNull();
  });
});
