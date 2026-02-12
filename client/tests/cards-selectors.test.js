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

jest.mock('../src/selectors/core', () => ({
  selectRecentCardId: (state) => state.core?.recentCardId,
}));

jest.mock('../src/selectors/router', () => ({
  selectPath: (state) => state.path || {},
}));

jest.mock('../src/selectors/users', () => ({
  selectCurrentUserId: (state) => state.currentUserId,
}));

jest.mock('../src/models/CustomFieldValue', () => ({
  buildCustomFieldValueId: ({ cardId, customFieldGroupId, customFieldId }) =>
    `${cardId}:${customFieldGroupId}:${customFieldId}`,
}));

import { CardLinkTypes, ListTypes } from '../src/constants/Enums';
import {
  makeSelectCardById,
  makeSelectCardByProjectCodeAndNumber,
  selectCardNamesById,
  makeSelectCardIndexById,
  makeSelectUserIdsByCardId,
  makeSelectLabelIdsByCardId,
  makeSelectShownOnFrontOfCardTaskListIdsByCardId,
  makeSelectAttachmentsTotalByCardId,
  makeSelectShownOnFrontOfCardCustomFieldValueIdsByCardId,
  makeSelectOutgoingCardLinksByCardId,
  makeSelectIncomingCardLinksByCardId,
  makeSelectNotificationsByCardId,
  makeSelectNotificationsTotalByCardId,
  makeSelectIsCardWithIdRecent,
  makeSelectIsCardBlockedById,
  selectIsCardWithIdAvailableForCurrentUser,
  selectCurrentCard,
  selectUserIdsForCurrentCard,
  selectLabelIdsForCurrentCard,
  selectTaskListIdsForCurrentCard,
  selectAttachmentIdsForCurrentCard,
  selectImageAttachmentIdsExceptCoverForCurrentCard,
  selectAttachmentsForCurrentCard,
  selectCustomFieldGroupIdsForCurrentCard,
  selectCommentIdsForCurrentCard,
  selectActivityIdsForCurrentCard,
  selectIsCurrentUserInCurrentCard,
} from '../src/selectors/cards';

const createState = ({ models, path = {}, currentUserId = 'u1', core = {} }) => ({
  models,
  path,
  currentUserId,
  core,
});

describe('cards selectors', () => {
  const boardModel = { id: 'b1', projectId: 'p1' };

  const cardModel = {
    id: 'c1',
    number: 10,
    name: 'Card One',
    boardId: 'b1',
    listId: 'l1',
    ref: { id: 'c1', name: 'Card One', boardId: 'b1', number: 10 },
    list: {
      getCardsModelArray: () => [{ id: 'c0' }, { id: 'c1' }, { id: 'c2' }],
    },
    users: { toRefArray: () => [{ id: 'u1' }, { id: 'u2' }] },
    labels: { toRefArray: () => [{ id: 'l1' }, { id: 'l2' }] },
    getShownOnFrontOfCardTaskListsModelArray: () => [{ id: 'tl1' }, { id: 'tl2' }],
    attachments: { count: () => 3 },
    board: {
      getCustomFieldGroupsQuerySet: () => ({
        toModelArray: () => [
          {
            id: 'g-board',
            getShownOnFrontOfCardCustomFieldsModelArray: () => [{ id: 'f1' }],
          },
        ],
      }),
    },
    getCustomFieldGroupsQuerySet: () => ({
      toModelArray: () => [
        {
          id: 'g-card',
          getShownOnFrontOfCardCustomFieldsModelArray: () => [{ id: 'f2' }],
        },
      ],
      toRefArray: () => [{ id: 'g1' }, { id: 'g2' }],
    }),
    getOutgoingCardLinksQuerySet: () => ({
      toRefArray: () => [
        { cardId: 'c1', linkedCardId: 'c2', type: CardLinkTypes.RELATED },
        { cardId: 'c1', linkedCardId: 'c3', type: CardLinkTypes.BLOCKED_BY },
      ],
    }),
    getIncomingCardLinksQuerySet: () => ({
      toRefArray: () => [{ cardId: 'c4', linkedCardId: 'c1', type: CardLinkTypes.BLOCKS }],
    }),
    getUnreadNotificationsQuerySet: () => ({
      toRefArray: () => [{ id: 'n1' }],
      count: () => 1,
    }),
    isAvailableForUser: () => true,
    getTaskListsQuerySet: () => ({ toRefArray: () => [{ id: 'tl1' }] }),
    getAttachmentsQuerySet: () => ({
      toRefArray: () => [{ id: 'a1' }, { id: 'a2' }],
      toModelArray: () => [
        { id: 'a1', data: { image: true }, coveredCard: null },
        { id: 'a2', data: { image: true }, coveredCard: { id: 'c1' } },
        { id: 'a3', data: { image: false }, coveredCard: null },
      ],
    }),
    getCommentsModelArray: () => [{ id: 'cm1' }],
    getActivitiesModelArray: () => [{ id: 'ac1' }],
    hasUserWithId: (id) => id === 'u1',
  };

  const projectModel = { id: 'p1', code: 'PRJ' };

  const models = {
    Card: {
      withId: jest.fn((id) => {
        if (id === 'c1' || id === 'local:c1') {
          return {
            ...cardModel,
            id,
            ref: { ...cardModel.ref, id },
          };
        }

        if (id === 'c3') {
          return { id: 'c3', listId: 'l-open' };
        }

        return null;
      }),
      all: jest.fn(() => ({
        toModelArray: () => [cardModel],
      })),
    },
    Project: {
      all: jest.fn(() => ({
        toModelArray: () => [projectModel],
      })),
    },
    Board: {
      withId: jest.fn((id) => (id === 'b1' ? boardModel : null)),
    },
    List: {
      withId: jest.fn((id) => {
        if (id === 'l-open') {
          return { id: 'l-open', type: ListTypes.ACTIVE };
        }

        return { id, type: ListTypes.CLOSED };
      }),
    },
    User: {
      withId: jest.fn((id) => ({ id })),
    },
    CustomFieldValue: {
      withId: jest.fn((id) => {
        if (id === 'c1:g-board:f1' || id === 'c1:g-card:f2') {
          return { id };
        }

        return null;
      }),
    },
  };

  test('selects cards by id/project+number and card names map', () => {
    const selectCardById = makeSelectCardById();
    const selectCardByProjectCodeAndNumber = makeSelectCardByProjectCodeAndNumber();
    const state = createState({ models });

    expect(selectCardById(state, 'c1')).toEqual({
      id: 'c1',
      name: 'Card One',
      boardId: 'b1',
      number: 10,
      isPersisted: true,
    });
    expect(selectCardById(state, 'local:c1')).toEqual({
      id: 'local:c1',
      name: 'Card One',
      boardId: 'b1',
      number: 10,
      isPersisted: false,
    });
    expect(selectCardById(state, 'missing')).toBeNull();

    expect(selectCardByProjectCodeAndNumber(state, 'PRJ', '10')).toEqual({
      id: 'c1',
      name: 'Card One',
      boardId: 'b1',
      number: 10,
      isPersisted: true,
    });
    expect(selectCardByProjectCodeAndNumber(state, 'PRJ', '999')).toBeNull();
    expect(selectCardByProjectCodeAndNumber(state, 'MISS', '10')).toBeNull();

    expect(selectCardNamesById(state)).toEqual({ c1: 'Card One' });
  });

  test('selects card index, user/label ids, shown task lists and attachments total', () => {
    const selectCardIndexById = makeSelectCardIndexById();
    const selectUserIdsByCardId = makeSelectUserIdsByCardId();
    const selectLabelIdsByCardId = makeSelectLabelIdsByCardId();
    const selectShownOnFrontTaskListIdsByCardId = makeSelectShownOnFrontOfCardTaskListIdsByCardId();
    const selectAttachmentsTotalByCardId = makeSelectAttachmentsTotalByCardId();
    const state = createState({ models });

    expect(selectCardIndexById(state, 'c1')).toBe(1);
    expect(selectCardIndexById(state, 'missing')).toBeNull();
    expect(selectUserIdsByCardId(state, 'c1')).toEqual(['u1', 'u2']);
    expect(selectUserIdsByCardId(state, 'missing')).toBeNull();
    expect(selectLabelIdsByCardId(state, 'c1')).toEqual(['l1', 'l2']);
    expect(selectLabelIdsByCardId(state, 'missing')).toBeNull();
    expect(selectShownOnFrontTaskListIdsByCardId(state, 'c1')).toEqual(['tl1', 'tl2']);
    expect(selectShownOnFrontTaskListIdsByCardId(state, 'missing')).toBeNull();
    expect(selectAttachmentsTotalByCardId(state, 'c1')).toBe(3);
    expect(selectAttachmentsTotalByCardId(state, 'missing')).toBeNull();
  });

  test('selects shown custom field values and outgoing/incoming card links', () => {
    const selectShownCustomFieldValueIdsByCardId =
      makeSelectShownOnFrontOfCardCustomFieldValueIdsByCardId();
    const selectOutgoingCardLinksByCardId = makeSelectOutgoingCardLinksByCardId();
    const selectIncomingCardLinksByCardId = makeSelectIncomingCardLinksByCardId();
    const state = createState({ models });

    expect(selectShownCustomFieldValueIdsByCardId(state, null)).toBeNull();
    expect(selectShownCustomFieldValueIdsByCardId(state, 'missing')).toBeNull();
    expect(selectShownCustomFieldValueIdsByCardId(state, 'c1')).toEqual(['c1:g-board:f1', 'c1:g-card:f2']);

    expect(selectOutgoingCardLinksByCardId(state, 'missing')).toEqual([]);
    expect(selectOutgoingCardLinksByCardId(state, 'c1')).toHaveLength(2);

    expect(selectIncomingCardLinksByCardId(state, 'missing')).toEqual([]);
    expect(selectIncomingCardLinksByCardId(state, 'c1')).toEqual([
      {
        cardId: 'c1',
        linkedCardId: 'c4',
        type: CardLinkTypes.BLOCKED_BY,
      },
    ]);
  });

  test('selects notifications and recency/blocking/availability flags', () => {
    const selectNotificationsByCardId = makeSelectNotificationsByCardId();
    const selectNotificationsTotalByCardId = makeSelectNotificationsTotalByCardId();
    const selectIsCardWithIdRecent = makeSelectIsCardWithIdRecent();
    const selectIsCardBlockedById = makeSelectIsCardBlockedById();
    const state = createState({ models, core: { recentCardId: 'c1' } });

    expect(selectNotificationsByCardId(state, 'c1')).toEqual([{ id: 'n1' }]);
    expect(selectNotificationsByCardId(state, 'missing')).toBeNull();
    expect(selectNotificationsTotalByCardId(state, 'c1')).toBe(1);
    expect(selectNotificationsTotalByCardId(state, 'missing')).toBeNull();

    expect(selectIsCardWithIdRecent(state, 'c1')).toBe(true);
    expect(selectIsCardWithIdRecent(state, 'missing')).toBe(false);

    expect(selectIsCardBlockedById(state, 'c1')).toBe(true);
    expect(selectIsCardBlockedById(state, 'missing')).toBe(false);

    expect(selectIsCardWithIdAvailableForCurrentUser(state, 'c1')).toBe(true);
    expect(selectIsCardWithIdAvailableForCurrentUser(state, 'missing')).toBe(false);
  });

  test('returns false for blocking selector when blockers are closed or absent', () => {
    const selectIsCardBlockedById = makeSelectIsCardBlockedById();
    const state = createState({
      models: {
        ...models,
        Card: {
          ...models.Card,
          withId: jest.fn((id) => {
            if (id === 'c1') {
              return {
                ...cardModel,
                getOutgoingCardLinksQuerySet: () => ({
                  toRefArray: () => [{ cardId: 'c1', linkedCardId: 'c3', type: CardLinkTypes.BLOCKED_BY }],
                }),
                getIncomingCardLinksQuerySet: () => ({
                  toRefArray: () => [],
                }),
              };
            }

            if (id === 'c3') {
              return { id: 'c3', listId: 'l-closed' };
            }

            return null;
          }),
        },
        List: {
          withId: jest.fn(() => ({ id: 'l-closed', type: ListTypes.CLOSED })),
        },
      },
    });

    expect(selectIsCardBlockedById(state, 'c1')).toBe(false);
  });

  test('current-card selectors return related ids and membership flags', () => {
    const state = createState({ models, path: { cardId: 'c1' }, currentUserId: 'u1' });

    expect(selectCurrentCard(state)).toEqual({ id: 'c1', name: 'Card One', boardId: 'b1', number: 10 });
    expect(selectUserIdsForCurrentCard(state)).toEqual(['u1', 'u2']);
    expect(selectLabelIdsForCurrentCard(state)).toEqual(['l1', 'l2']);
    expect(selectTaskListIdsForCurrentCard(state)).toEqual(['tl1']);
    expect(selectAttachmentIdsForCurrentCard(state)).toEqual(['a1', 'a2']);
    expect(selectImageAttachmentIdsExceptCoverForCurrentCard(state)).toEqual(['a1']);
    expect(selectAttachmentsForCurrentCard(state)).toEqual([{ id: 'a1' }, { id: 'a2' }]);
    expect(selectCustomFieldGroupIdsForCurrentCard(state)).toEqual(['g1', 'g2']);
    expect(selectCommentIdsForCurrentCard(state)).toEqual(['cm1']);
    expect(selectActivityIdsForCurrentCard(state)).toEqual(['ac1']);
    expect(selectIsCurrentUserInCurrentCard(state)).toBe(true);
  });

  test('guards for current-card selectors when path id/card are missing', () => {
    const noIdState = createState({ models, path: {}, currentUserId: 'u2' });

    expect(selectCurrentCard(noIdState)).toBeUndefined();
    expect(selectUserIdsForCurrentCard(noIdState)).toBeUndefined();
    expect(selectLabelIdsForCurrentCard(noIdState)).toBeUndefined();
    expect(selectTaskListIdsForCurrentCard(noIdState)).toBeUndefined();
    expect(selectAttachmentIdsForCurrentCard(noIdState)).toBeUndefined();
    expect(selectImageAttachmentIdsExceptCoverForCurrentCard(noIdState)).toBeUndefined();
    expect(selectAttachmentsForCurrentCard(noIdState)).toBeUndefined();
    expect(selectCustomFieldGroupIdsForCurrentCard(noIdState)).toBeUndefined();
    expect(selectCommentIdsForCurrentCard(noIdState)).toBeUndefined();
    expect(selectActivityIdsForCurrentCard(noIdState)).toBeUndefined();
    expect(selectIsCurrentUserInCurrentCard(noIdState)).toBe(false);

    const missingCardState = createState({ models, path: { cardId: 'missing' }, currentUserId: 'u2' });
    expect(selectCurrentCard(missingCardState)).toBeNull();
    expect(selectUserIdsForCurrentCard(missingCardState)).toBeNull();
    expect(selectLabelIdsForCurrentCard(missingCardState)).toBeNull();
    expect(selectTaskListIdsForCurrentCard(missingCardState)).toBeNull();
    expect(selectAttachmentIdsForCurrentCard(missingCardState)).toBeNull();
    expect(selectImageAttachmentIdsExceptCoverForCurrentCard(missingCardState)).toBeNull();
    expect(selectAttachmentsForCurrentCard(missingCardState)).toBeNull();
    expect(selectCustomFieldGroupIdsForCurrentCard(missingCardState)).toBeNull();
    expect(selectCommentIdsForCurrentCard(missingCardState)).toBeNull();
    expect(selectActivityIdsForCurrentCard(missingCardState)).toBeNull();
    expect(selectIsCurrentUserInCurrentCard(missingCardState)).toBe(false);
  });
});
