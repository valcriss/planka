/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const createBaseCardType = (baseCardType) => ({
  type: ActionTypes.BASE_CARD_TYPE_CREATE,
  payload: { baseCardType },
});

createBaseCardType.success = (localId, baseCardType) => ({
  type: ActionTypes.BASE_CARD_TYPE_CREATE__SUCCESS,
  payload: { localId, baseCardType },
});

createBaseCardType.failure = (localId, error) => ({
  type: ActionTypes.BASE_CARD_TYPE_CREATE__FAILURE,
  payload: { localId, error },
});

const handleBaseCardTypeCreate = (baseCardType) => ({
  type: ActionTypes.BASE_CARD_TYPE_CREATE_HANDLE,
  payload: { baseCardType },
});

const updateBaseCardType = (id, data) => ({
  type: ActionTypes.BASE_CARD_TYPE_UPDATE,
  payload: { id, data },
});

updateBaseCardType.success = (baseCardType) => ({
  type: ActionTypes.BASE_CARD_TYPE_UPDATE__SUCCESS,
  payload: { baseCardType },
});

updateBaseCardType.failure = (id, error) => ({
  type: ActionTypes.BASE_CARD_TYPE_UPDATE__FAILURE,
  payload: { id, error },
});

const handleBaseCardTypeUpdate = (baseCardType) => ({
  type: ActionTypes.BASE_CARD_TYPE_UPDATE_HANDLE,
  payload: { baseCardType },
});

const deleteBaseCardType = (id) => ({
  type: ActionTypes.BASE_CARD_TYPE_DELETE,
  payload: { id },
});

deleteBaseCardType.success = (baseCardType) => ({
  type: ActionTypes.BASE_CARD_TYPE_DELETE__SUCCESS,
  payload: { baseCardType },
});

deleteBaseCardType.failure = (id, error) => ({
  type: ActionTypes.BASE_CARD_TYPE_DELETE__FAILURE,
  payload: { id, error },
});

const handleBaseCardTypeDelete = (baseCardType) => ({
  type: ActionTypes.BASE_CARD_TYPE_DELETE_HANDLE,
  payload: { baseCardType },
});

export default {
  createBaseCardType,
  handleBaseCardTypeCreate,
  updateBaseCardType,
  handleBaseCardTypeUpdate,
  deleteBaseCardType,
  handleBaseCardTypeDelete,
};
