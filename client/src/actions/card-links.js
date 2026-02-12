/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const createCardLink = (cardId, linkedCardId, type) => ({
  type: ActionTypes.CARD_LINK_CREATE,
  payload: {
    cardId,
    linkedCardId,
    type,
  },
});

createCardLink.success = (cardLink) => ({
  type: ActionTypes.CARD_LINK_CREATE__SUCCESS,
  payload: {
    cardLink,
  },
});

createCardLink.failure = (cardId, linkedCardId, error) => ({
  type: ActionTypes.CARD_LINK_CREATE__FAILURE,
  payload: {
    cardId,
    linkedCardId,
    error,
  },
});

const handleCardLinkCreate = (cardLink) => ({
  type: ActionTypes.CARD_LINK_CREATE_HANDLE,
  payload: {
    cardLink,
  },
});

const deleteCardLink = (id) => ({
  type: ActionTypes.CARD_LINK_DELETE,
  payload: {
    id,
  },
});

deleteCardLink.success = (cardLink) => ({
  type: ActionTypes.CARD_LINK_DELETE__SUCCESS,
  payload: {
    cardLink,
  },
});

deleteCardLink.failure = (id, error) => ({
  type: ActionTypes.CARD_LINK_DELETE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleCardLinkDelete = (cardLink) => ({
  type: ActionTypes.CARD_LINK_DELETE_HANDLE,
  payload: {
    cardLink,
  },
});

const searchCardsForLink = (boardId, cardId, search) => ({
  type: ActionTypes.CARD_LINKS_SEARCH,
  payload: {
    boardId,
    cardId,
    search,
  },
});

searchCardsForLink.success = (boardId, cardId, search, cards, lists, boards, projects) => ({
  type: ActionTypes.CARD_LINKS_SEARCH__SUCCESS,
  payload: {
    boardId,
    cardId,
    search,
    cards,
    lists,
    boards,
    projects,
  },
});

searchCardsForLink.failure = (boardId, cardId, search, error) => ({
  type: ActionTypes.CARD_LINKS_SEARCH__FAILURE,
  payload: {
    boardId,
    cardId,
    search,
    error,
  },
});

export default {
  createCardLink,
  handleCardLinkCreate,
  deleteCardLink,
  handleCardLinkDelete,
  searchCardsForLink,
};
