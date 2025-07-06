/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const createCardType = (projectId, cardType) => ({
  type: ActionTypes.CARD_TYPE_CREATE,
  payload: {
    projectId,
    cardType,
  },
});

createCardType.success = (localId, cardType) => ({
  type: ActionTypes.CARD_TYPE_CREATE__SUCCESS,
  payload: {
    localId,
    cardType,
  },
});

createCardType.failure = (localId, error) => ({
  type: ActionTypes.CARD_TYPE_CREATE__FAILURE,
  payload: {
    localId,
    error,
  },
});

const handleCardTypeCreate = (cardType) => ({
  type: ActionTypes.CARD_TYPE_CREATE_HANDLE,
  payload: {
    cardType,
  },
});

const updateCardType = (id, data) => ({
  type: ActionTypes.CARD_TYPE_UPDATE,
  payload: {
    id,
    data,
  },
});

updateCardType.success = (cardType) => ({
  type: ActionTypes.CARD_TYPE_UPDATE__SUCCESS,
  payload: {
    cardType,
  },
});

updateCardType.failure = (id, error) => ({
  type: ActionTypes.CARD_TYPE_UPDATE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleCardTypeUpdate = (cardType) => ({
  type: ActionTypes.CARD_TYPE_UPDATE_HANDLE,
  payload: {
    cardType,
  },
});

const deleteCardType = (id) => ({
  type: ActionTypes.CARD_TYPE_DELETE,
  payload: {
    id,
  },
});

deleteCardType.success = (cardType) => ({
  type: ActionTypes.CARD_TYPE_DELETE__SUCCESS,
  payload: {
    cardType,
  },
});

deleteCardType.failure = (id, error) => ({
  type: ActionTypes.CARD_TYPE_DELETE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleCardTypeDelete = (cardType) => ({
  type: ActionTypes.CARD_TYPE_DELETE_HANDLE,
  payload: {
    cardType,
  },
});

export default {
  createCardType,
  handleCardTypeCreate,
  updateCardType,
  handleCardTypeUpdate,
  deleteCardType,
  handleCardTypeDelete,
};
