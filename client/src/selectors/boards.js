/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';

import orm from '../orm';
import { selectPath } from './router';
import { selectCurrentUserId } from './users';
import { isLocalId } from '../utils/local-id';
import { isListArchiveOrTrash } from '../utils/record-helpers';
import { ListTypes } from '../constants/Enums';

export const makeSelectBoardById = () =>
  createSelector(
    orm,
    (_, id) => id,
    (state) => selectPath(state).boardId,
    ({ Board }, id) => {
      const boardModel = Board.withId(id);

      if (!boardModel) {
        return boardModel;
      }

      return {
        ...boardModel.ref,
        isPersisted: !isLocalId(boardModel.id),
      };
    },
  );

export const selectBoardById = makeSelectBoardById();

export const makeSelectCurrentUserMembershipByBoardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    (state) => selectCurrentUserId(state),
    ({ Board }, id, currentUserId) => {
      if (!id) {
        return id;
      }

      const boardModel = Board.withId(id);

      if (!boardModel) {
        return boardModel;
      }

      const boardMembershipModel = boardModel.getMembershipModelByUserId(currentUserId);

      if (!boardMembershipModel) {
        return boardMembershipModel;
      }

      return boardMembershipModel.ref;
    },
  );

const selectCurrentUserMembershipByBoardId = makeSelectCurrentUserMembershipByBoardId();

export const makeSelectNotificationsTotalByBoardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    (state) => selectCurrentUserId(state),
    ({ Board }, id) => {
      const boardModel = Board.withId(id);

      if (!boardModel) {
        return boardModel;
      }

      return boardModel.getUnreadNotificationsQuerySet().count();
    },
  );

export const selectNotificationsTotalByBoardId = makeSelectNotificationsTotalByBoardId();

export const makeSelectNotificationServiceIdsByBoardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    (state) => selectCurrentUserId(state),
    ({ Board }, id) => {
      const boardModel = Board.withId(id);

      if (!boardModel) {
        return boardModel;
      }

      return boardModel
        .getNotificationServicesQuerySet()
        .toRefArray()
        .map((notificationService) => notificationService.id);
    },
  );

export const selectNotificationServiceIdsByBoardId = makeSelectNotificationServiceIdsByBoardId();

export const selectIsBoardWithIdAvailableForCurrentUser = createSelector(
  orm,
  (_, id) => id,
  (state) => selectCurrentUserId(state),
  ({ Board, User }, id, currentUserId) => {
    const boardModel = Board.withId(id);

    if (!boardModel) {
      return false;
    }

    const currentUserModel = User.withId(currentUserId);
    return boardModel.isAvailableForUser(currentUserModel);
  },
);

export const selectCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    return boardModel.ref;
  },
);

export const selectMembershipsForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    return boardModel
      .getMembershipsQuerySet()
      .toModelArray()
      .map((boardMembershipModel) => ({
        ...boardMembershipModel.ref,
        isPersisted: !isLocalId(boardMembershipModel.id),
        user: boardMembershipModel.user.ref,
      }));
  },
);

export const selectMemberUserIdsForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    return boardModel
      .getMembershipsQuerySet()
      .toModelArray()
      .map((boardMembershipModel) => boardMembershipModel.user.id);
  },
);

export const selectCurrentUserMembershipForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  (state) => selectCurrentUserId(state),
  ({ Board }, id, currentUserId) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    const boardMembershipModel = boardModel.getMembershipModelByUserId(currentUserId);

    if (!boardMembershipModel) {
      return boardMembershipModel;
    }

    return boardMembershipModel.ref;
  },
);

export const selectLabelsForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    return boardModel.getLabelsQuerySet().toRefArray();
  },
);

export const selectArchiveListIdForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    const listModel = boardModel.lists
      .filter({
        type: ListTypes.ARCHIVE,
      })
      .first();

    return listModel.id;
  },
);

export const selectTrashListIdForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    const listModel = boardModel.lists
      .filter({
        type: ListTypes.TRASH,
      })
      .first();

    return listModel.id;
  },
);

export const makeSelectListIdBySlugForCurrentBoard = () =>
  createSelector(
    orm,
    (state) => selectPath(state).boardId,
    (_, slug) => slug,
    ({ Board }, boardId, slug) => {
      if (!boardId) {
        return boardId;
      }

      const boardModel = Board.withId(boardId);

      if (!boardModel) {
        return boardModel;
      }

      const listModel = boardModel.lists.filter({ slug }).first();

      return listModel && listModel.id;
    },
  );

export const selectListIdBySlugForCurrentBoard = makeSelectListIdBySlugForCurrentBoard();

export const makeSelectBoardIdByProjectIdAndSlug = () =>
  createSelector(
    orm,
    (_, projectId, slug) => ({ projectId, slug }),
    (state) => selectCurrentUserId(state),
    ({ Project, User }, { projectId, slug }, currentUserId) => {
      const projectModel = Project.withId(projectId);

      if (!projectModel) {
        return projectModel;
      }

      const currentUserModel = User.withId(currentUserId);
      const boardsModels = projectModel.getBoardsModelArrayAvailableForUser(currentUserModel);

      const boardModel = boardsModels.find((b) => b.slug === slug);

      return boardModel && boardModel.id;
    },
  );

export const selectBoardIdByProjectIdAndSlug = makeSelectBoardIdByProjectIdAndSlug();

export const selectFiniteListIdsForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    return boardModel
      .getFiniteListsQuerySet()
      .toRefArray()
      .map((list) => list.id);
  },
);

export const makeSelectFiniteListIdsByBoardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Board }, id) => {
      if (!id) {
        return id;
      }

      const boardModel = Board.withId(id);

      if (!boardModel) {
        return boardModel;
      }

      return boardModel
        .getFiniteListsQuerySet()
        .toRefArray()
        .map((list) => list.id);
    },
  );

export const makeSelectListIdByTypeByBoardId = () =>
  createSelector(
    orm,
    (_, boardId) => boardId,
    (_, __, type) => type,
    ({ Board }, boardId, type) => {
      if (!boardId) {
        return boardId;
      }

      const boardModel = Board.withId(boardId);

      if (!boardModel) {
        return boardModel;
      }

      const listModel = boardModel.lists.filter({ type }).first();

      return listModel && listModel.id;
    },
  );

// TODO: rename?
export const selectAvailableListsForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    return boardModel
      .getListsQuerySet()
      .toRefArray()
      .filter((list) => !isListArchiveOrTrash(list));
  },
);

export const selectFilteredCardIdsForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    return boardModel.getFilteredCardsModelArray().map((cardModel) => cardModel.id);
  },
);

// Cartes filtrées du board courant, regroupées par jour (clé: YYYY-MM-DD) sur la base de dueDate
// Ne retourne que les cartes avec une dueDate définie.
export const selectFilteredCardsGroupedByDueDayForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);
    if (!boardModel) {
      return boardModel;
    }

    const result = {};
    boardModel.getFilteredCardsModelArray().forEach((cardModel) => {
      const { dueDate } = cardModel.ref;
      if (!dueDate) return;
      // dueDate peut être string ISO ou Date selon ingestion; normaliser
      const dateObj = dueDate instanceof Date ? dueDate : new Date(dueDate);
      if (Number.isNaN(dateObj.getTime())) return;
      const key = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(cardModel.id);
    });

    return result; // { '2025-10-04': ['c1','c2'], ... }
  },
);

export const selectCustomFieldGroupIdsForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    return boardModel
      .getCustomFieldGroupsQuerySet()
      .toRefArray()
      .map((customFieldGroup) => customFieldGroup.id);
  },
);

export const selectCustomFieldGroupsForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    return boardModel
      .getCustomFieldGroupsQuerySet()
      .toModelArray()
      .map((customFieldGroupModel) => {
        if (!customFieldGroupModel.name) {
          return {
            ...customFieldGroupModel.ref,
            name: customFieldGroupModel.baseCustomFieldGroup.name,
          };
        }

        return customFieldGroupModel.ref;
      });
  },
);

export const selectActivityIdsForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    return boardModel.getActivitiesModelArray().map((activity) => activity.id);
  },
);

export const selectFilterUserIdsForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    return boardModel.filterUsers.toRefArray().map((user) => user.id);
  },
);

export const selectFilterLabelIdsForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ Board }, id) => {
    if (!id) {
      return id;
    }

    const boardModel = Board.withId(id);

    if (!boardModel) {
      return boardModel;
    }

    return boardModel.filterLabels.toRefArray().map((label) => label.id);
  },
);

export const selectIsBoardWithIdExists = createSelector(
  orm,
  (_, id) => id,
  ({ Board }, id) => Board.idExists(id),
);

export default {
  makeSelectBoardById,
  selectBoardById,
  makeSelectCurrentUserMembershipByBoardId,
  selectCurrentUserMembershipByBoardId,
  makeSelectNotificationsTotalByBoardId,
  selectNotificationsTotalByBoardId,
  makeSelectNotificationServiceIdsByBoardId,
  selectNotificationServiceIdsByBoardId,
  selectIsBoardWithIdAvailableForCurrentUser,
  selectCurrentBoard,
  selectMembershipsForCurrentBoard,
  selectMemberUserIdsForCurrentBoard,
  selectCurrentUserMembershipForCurrentBoard,
  selectLabelsForCurrentBoard,
  selectArchiveListIdForCurrentBoard,
  selectTrashListIdForCurrentBoard,
  selectFiniteListIdsForCurrentBoard,
  makeSelectFiniteListIdsByBoardId,
  makeSelectListIdByTypeByBoardId,
  selectAvailableListsForCurrentBoard,
  selectFilteredCardIdsForCurrentBoard,
  selectFilteredCardsGroupedByDueDayForCurrentBoard,
  makeSelectListIdBySlugForCurrentBoard,
  selectListIdBySlugForCurrentBoard,
  makeSelectBoardIdByProjectIdAndSlug,
  selectBoardIdByProjectIdAndSlug,
  selectCustomFieldGroupIdsForCurrentBoard,
  selectCustomFieldGroupsForCurrentBoard,
  selectActivityIdsForCurrentBoard,
  selectFilterUserIdsForCurrentBoard,
  selectFilterLabelIdsForCurrentBoard,
  selectIsBoardWithIdExists,
};
