/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import EntryActionTypes from '../constants/EntryActionTypes';

const createCardLink = (cardId, linkedCardId, type) => ({
  type: EntryActionTypes.CARD_LINK_CREATE,
  payload: {
    cardId,
    linkedCardId,
    type,
  },
});

const handleCardLinkCreate = (cardLink) => ({
  type: EntryActionTypes.CARD_LINK_CREATE_HANDLE,
  payload: {
    cardLink,
  },
});

const deleteCardLink = (id) => ({
  type: EntryActionTypes.CARD_LINK_DELETE,
  payload: {
    id,
  },
});

const handleCardLinkDelete = (cardLink) => ({
  type: EntryActionTypes.CARD_LINK_DELETE_HANDLE,
  payload: {
    cardLink,
  },
});

const searchCardsForLink = (boardId, cardId, search) => ({
  type: EntryActionTypes.CARD_LINKS_SEARCH,
  payload: {
    boardId,
    cardId,
    search,
  },
});

export default {
  createCardLink,
  handleCardLinkCreate,
  deleteCardLink,
  handleCardLinkDelete,
  searchCardsForLink,
};
