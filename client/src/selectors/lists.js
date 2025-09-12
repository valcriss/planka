/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';

import orm from '../orm';
import { selectPath } from './router';
import { isLocalId } from '../utils/local-id';
import { BoardContexts, ListTypes } from '../constants/Enums';

export const makeSelectListById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ List }, id) => {
      const listModel = List.withId(id);

      if (!listModel) {
        return listModel;
      }

      return {
        ...listModel.ref,
        isPersisted: !isLocalId(id),
      };
    },
  );

export const selectListById = makeSelectListById();

export const makeSelectCardIdsByListId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ List }, id) => {
      const listModel = List.withId(id);

      if (!listModel) {
        return listModel;
      }

      return listModel.getCardsModelArray().map((cardModel) => cardModel.id);
    },
  );

export const selectCardIdsByListId = makeSelectCardIdsByListId();

export const makeSelectFilteredCardIdsByListId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ List }, id) => {
      const listModel = List.withId(id);

      if (!listModel) {
        return listModel;
      }

      return listModel.getFilteredCardsModelArray().map((cardModel) => cardModel.id);
    },
  );

export const selectFilteredCardIdsByListId = makeSelectFilteredCardIdsByListId();

export const makeSelectListIdBySlug = () =>
  createSelector(
    orm,
    (_, slug) => slug,
    ({ List }, slug) => {
      const listModel = List.all().filter({ slug }).first();

      return listModel && listModel.id;
    },
  );

export const selectListIdBySlug = makeSelectListIdBySlug();

export const makeSelectStoryPointsTotalByListId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ List }, id) => {
      const listModel = List.withId(id);

      if (!listModel) {
        return listModel;
      }

      return listModel
        .getFilteredCardsModelArray()
        .reduce((total, cardModel) => total + cardModel.storyPoints, 0);
    },
  );

export const selectStoryPointsTotalByListId = makeSelectStoryPointsTotalByListId();

export const selectCurrentListId = createSelector(
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

    if (boardModel.context === BoardContexts.BOARD) {
      return null;
    }

    const listModel = boardModel.lists
      .filter({
        type: boardModel.context || ListTypes.ACTIVE, // TODO: hack?
      })
      .first();

    return listModel && listModel.id;
  },
);

export const selectCurrentList = createSelector(
  orm,
  (state) => selectCurrentListId(state),
  ({ List }, id) => {
    if (!id) {
      return id;
    }

    const listModel = List.withId(id);

    if (!listModel) {
      return listModel;
    }

    return listModel.ref;
  },
);

export const selectFirstFiniteListId = createSelector(
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

    const listModel = boardModel.getFiniteListsQuerySet().first();
    return listModel && listModel.id;
  },
);

export const selectFilteredCardIdsForCurrentList = createSelector(
  orm,
  (state) => selectCurrentListId(state),
  ({ List }, id) => {
    if (!id) {
      return id;
    }

    const listModel = List.withId(id);

    if (!listModel) {
      return listModel;
    }

    return listModel.getFilteredCardsModelArray().map((cardModel) => cardModel.id);
  },
);

export default {
  makeSelectListById,
  selectListById,
  makeSelectCardIdsByListId,
  selectCardIdsByListId,
  makeSelectFilteredCardIdsByListId,
  selectFilteredCardIdsByListId,
  makeSelectStoryPointsTotalByListId,
  selectStoryPointsTotalByListId,
  makeSelectListIdBySlug,
  selectListIdBySlug,
  selectCurrentListId,
  selectCurrentList,
  selectFirstFiniteListId,
  selectFilteredCardIdsForCurrentList,
};
