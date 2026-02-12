/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';

import orm from '../orm';
import { selectRecentCardId } from './core';
import { selectPath } from './router';
import { selectCurrentUserId } from './users';
import { buildCustomFieldValueId } from '../models/CustomFieldValue';
import { isLocalId } from '../utils/local-id';
import { CardLinkInverseTypeMap, ListTypes, CardLinkTypes } from '../constants/Enums';

const isBlockingLinkActive = (Card, List, linkedCardId) => {
  const linkedCard = Card.withId(linkedCardId);

  if (!linkedCard) {
    return false;
  }

  const linkedList = List.withId(linkedCard.listId);

  if (linkedList) {
    return linkedList.type !== ListTypes.CLOSED;
  }

  return !linkedCard.closedAt;
};

export const makeSelectCardById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return {
        ...cardModel.ref,
        isPersisted: !isLocalId(id),
      };
    },
  );

export const selectCardById = makeSelectCardById();

export const makeSelectCardByProjectCodeAndNumber = () =>
  createSelector(
    orm,
    (_, projectCode, number) => ({ projectCode, number: Number(number) }),
    ({ Card, Project, Board }, { projectCode, number }) => {
      const projectModel = Project.all()
        .toModelArray()
        .find((p) => p.code === projectCode);

      if (!projectModel) {
        return null;
      }

      const cardModel = Card.all()
        .toModelArray()
        .find((c) => {
          if (c.number !== number) {
            return false;
          }

          const boardModel = Board.withId(c.boardId);
          return boardModel && boardModel.projectId === projectModel.id;
        });

      if (!cardModel) {
        return null;
      }

      return {
        ...cardModel.ref,
        isPersisted: !isLocalId(cardModel.id),
      };
    },
  );

export const selectCardByProjectCodeAndNumber = makeSelectCardByProjectCodeAndNumber();

export const selectCardNamesById = createSelector(orm, ({ Card }) =>
  Card.all()
    .toModelArray()
    .reduce(
      (result, cardModel) => ({
        ...result,
        [cardModel.id]: cardModel.name,
      }),
      {},
    ),
);

export const makeSelectCardIndexById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return cardModel.list
        .getCardsModelArray()
        .findIndex((cardModelItem) => cardModelItem.id === cardModel.id);
    },
  );

export const selectCardIndexById = makeSelectCardIndexById();

export const makeSelectUserIdsByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return cardModel.users.toRefArray().map((user) => user.id);
    },
  );

export const selectUserIdsByCardId = makeSelectUserIdsByCardId();

export const makeSelectLabelIdsByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return cardModel.labels.toRefArray().map((label) => label.id);
    },
  );

export const selectLabelIdsByCardId = makeSelectLabelIdsByCardId();

export const makeSelectShownOnFrontOfCardTaskListIdsByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return cardModel.getShownOnFrontOfCardTaskListsModelArray().map((taskList) => taskList.id);
    },
  );

export const selectShownOnFrontOfCardTaskListIdsByCardId =
  makeSelectShownOnFrontOfCardTaskListIdsByCardId();

export const makeSelectAttachmentsTotalByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return cardModel.attachments.count();
    },
  );

export const selectAttachmentsTotalByCardId = makeSelectAttachmentsTotalByCardId();

export const makeSelectShownOnFrontOfCardCustomFieldValueIdsByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card, CustomFieldValue }, id) => {
      if (!id) {
        return id;
      }

      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return [
        ...cardModel.board
          .getCustomFieldGroupsQuerySet()
          .toModelArray()
          .flatMap((customFieldGroupModel) =>
            customFieldGroupModel
              .getShownOnFrontOfCardCustomFieldsModelArray()
              .flatMap((customFieldModel) => {
                const customFieldValue = CustomFieldValue.withId(
                  buildCustomFieldValueId({
                    cardId: id,
                    customFieldGroupId: customFieldGroupModel.id,
                    customFieldId: customFieldModel.id,
                  }),
                );

                return customFieldValue ? customFieldValue.id : [];
              }),
          ),
        ...cardModel
          .getCustomFieldGroupsQuerySet()
          .toModelArray()
          .flatMap((customFieldGroupModel) =>
            customFieldGroupModel
              .getShownOnFrontOfCardCustomFieldsModelArray()
              .flatMap((customFieldModel) => {
                const customFieldValue = CustomFieldValue.withId(
                  buildCustomFieldValueId({
                    cardId: id,
                    customFieldGroupId: customFieldGroupModel.id,
                    customFieldId: customFieldModel.id,
                  }),
                );

                return customFieldValue ? customFieldValue.id : [];
              }),
          ),
      ];
    },
  );

export const selectShownOnFrontOfCardCustomFieldValueIdsByCardId =
  makeSelectShownOnFrontOfCardCustomFieldValueIdsByCardId();

export const makeSelectOutgoingCardLinksByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return [];
      }

      return cardModel.getOutgoingCardLinksQuerySet().toRefArray();
    },
  );

export const selectOutgoingCardLinksByCardId = makeSelectOutgoingCardLinksByCardId();

export const makeSelectIncomingCardLinksByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return [];
      }

      return cardModel
        .getIncomingCardLinksQuerySet()
        .toRefArray()
        .map((cardLink) => ({
          ...cardLink,
          cardId: cardModel.id,
          linkedCardId: cardLink.cardId,
          type: CardLinkInverseTypeMap[cardLink.type] || cardLink.type,
        }));
    },
  );

export const selectIncomingCardLinksByCardId = makeSelectIncomingCardLinksByCardId();

export const makeSelectNotificationsByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return cardModel.getUnreadNotificationsQuerySet().toRefArray();
    },
  );

export const selectNotificationsByCardId = makeSelectNotificationsByCardId();

export const makeSelectNotificationsTotalByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return cardModel.getUnreadNotificationsQuerySet().count();
    },
  );

export const selectNotificationsTotalByCardId = makeSelectNotificationsTotalByCardId();

export const makeSelectIsCardWithIdRecent = () =>
  createSelector(
    orm,
    (_, id) => id,
    (state) => selectRecentCardId(state),
    ({ Card }, id, recentCardId) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return false;
      }

      return cardModel.id === recentCardId;
    },
  );

export const selectIsCardWithIdRecent = makeSelectIsCardWithIdRecent();

export const makeSelectIsCardBlockedById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card, List }, id) => {
      const cardModel = Card.withId(id);
      if (!cardModel) {
        return false;
      }
      const outgoing = cardModel.getOutgoingCardLinksQuerySet().toRefArray();
      const incoming = cardModel
        .getIncomingCardLinksQuerySet()
        .toRefArray()
        .map((link) => ({
          ...link,
          linkedCardId: link.cardId,
          type: CardLinkInverseTypeMap[link.type] || link.type,
        }));
      const all = [...outgoing, ...incoming];
      for (let i = 0; i < all.length; i += 1) {
        const link = all[i];
        if (
          link.type === CardLinkTypes.BLOCKED_BY ||
          link.type === CardLinkTypes.BLOCKS ||
          link.type === CardLinkTypes.DEPENDS_ON
        ) {
          if (isBlockingLinkActive(Card, List, link.linkedCardId)) {
            return true;
          }
        }
      }
      return false;
    },
  );

export const selectIsCardBlockedById = makeSelectIsCardBlockedById();

export const makeSelectCardLinkIndicatorById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card, List }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return null;
      }

      const outgoing = cardModel.getOutgoingCardLinksQuerySet().toRefArray();
      const incoming = cardModel
        .getIncomingCardLinksQuerySet()
        .toRefArray()
        .map((link) => ({
          ...link,
          linkedCardId: link.cardId,
          type: CardLinkInverseTypeMap[link.type] || link.type,
        }));

      const all = [...outgoing, ...incoming];

      let hasActiveBlockedBy = false;
      let hasActiveBlocks = false;
      let hasRelated = false;
      let hasDuplicate = false;

      for (let i = 0; i < all.length; i += 1) {
        const link = all[i];

        if (link.type === CardLinkTypes.BLOCKED_BY || link.type === CardLinkTypes.DEPENDS_ON) {
          if (isBlockingLinkActive(Card, List, link.linkedCardId)) {
            hasActiveBlockedBy = true;
          }
          continue; // eslint-disable-line no-continue
        }

        if (link.type === CardLinkTypes.BLOCKS) {
          if (isBlockingLinkActive(Card, List, link.linkedCardId)) {
            hasActiveBlocks = true;
          }
          continue; // eslint-disable-line no-continue
        }

        if (link.type === CardLinkTypes.RELATED) {
          hasRelated = true;
          continue; // eslint-disable-line no-continue
        }

        if (link.type === CardLinkTypes.DUPLICATES || link.type === CardLinkTypes.DUPLICATED_BY) {
          hasDuplicate = true;
        }
      }

      if (hasActiveBlockedBy) {
        return 'blocked';
      }

      if (hasActiveBlocks) {
        return 'blocks';
      }

      if (hasRelated) {
        return 'related';
      }

      if (hasDuplicate) {
        return 'duplicate';
      }

      return null;
    },
  );

export const selectCardLinkIndicatorById = makeSelectCardLinkIndicatorById();

export const selectIsCardWithIdAvailableForCurrentUser = createSelector(
  orm,
  (_, id) => id,
  (state) => selectCurrentUserId(state),
  ({ Card, User }, id, currentUserId) => {
    const cardModel = Card.withId(id);

    if (!cardModel) {
      return false;
    }

    const currentUserModel = User.withId(currentUserId);
    return cardModel.isAvailableForUser(currentUserModel);
  },
);

export const selectCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel.ref;
  },
);

export const selectUserIdsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel.users.toRefArray().map((user) => user.id);
  },
);

export const selectLabelIdsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel.labels.toRefArray().map((label) => label.id);
  },
);

export const selectTaskListIdsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel
      .getTaskListsQuerySet()
      .toRefArray()
      .map((taskList) => taskList.id);
  },
);

export const selectAttachmentIdsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel
      .getAttachmentsQuerySet()
      .toRefArray()
      .map((attachment) => attachment.id);
  },
);

export const selectImageAttachmentIdsExceptCoverForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel
      .getAttachmentsQuerySet()
      .toModelArray()
      .filter(
        (attachmentModel) =>
          attachmentModel.data && attachmentModel.data.image && !attachmentModel.coveredCard,
      )
      .map((attachmentModel) => attachmentModel.id);
  },
);

export const selectAttachmentsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel.getAttachmentsQuerySet().toRefArray();
  },
);

export const selectCustomFieldGroupIdsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel
      .getCustomFieldGroupsQuerySet()
      .toRefArray()
      .map((customFieldGroup) => customFieldGroup.id);
  },
);

export const selectCommentIdsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel.getCommentsModelArray().map((commentModel) => commentModel.id);
  },
);

export const selectActivityIdsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel.getActivitiesModelArray().map((activity) => activity.id);
  },
);

export const selectIsCurrentUserInCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  (state) => selectCurrentUserId(state),
  ({ Card }, id, currentUserId) => {
    if (!id) {
      return false;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return false;
    }

    return cardModel.hasUserWithId(currentUserId);
  },
);

export default {
  makeSelectCardById,
  selectCardById,
  makeSelectCardByProjectCodeAndNumber,
  selectCardByProjectCodeAndNumber,
  makeSelectCardIndexById,
  selectCardIndexById,
  selectCardNamesById,
  makeSelectUserIdsByCardId,
  selectUserIdsByCardId,
  makeSelectLabelIdsByCardId,
  selectLabelIdsByCardId,
  makeSelectShownOnFrontOfCardTaskListIdsByCardId,
  selectShownOnFrontOfCardTaskListIdsByCardId,
  makeSelectAttachmentsTotalByCardId,
  makeSelectShownOnFrontOfCardCustomFieldValueIdsByCardId,
  selectShownOnFrontOfCardCustomFieldValueIdsByCardId,
  makeSelectOutgoingCardLinksByCardId,
  selectOutgoingCardLinksByCardId,
  makeSelectIncomingCardLinksByCardId,
  selectIncomingCardLinksByCardId,
  selectAttachmentsTotalByCardId,
  makeSelectNotificationsByCardId,
  selectNotificationsByCardId,
  makeSelectNotificationsTotalByCardId,
  selectNotificationsTotalByCardId,
  makeSelectIsCardWithIdRecent,
  selectIsCardWithIdRecent,
  selectIsCardWithIdAvailableForCurrentUser,
  makeSelectIsCardBlockedById,
  selectIsCardBlockedById,
  makeSelectCardLinkIndicatorById,
  selectCardLinkIndicatorById,
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
};
