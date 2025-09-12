/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import EntryActionTypes from '../constants/EntryActionTypes';

const createBaseCardType = (data) => ({
  type: EntryActionTypes.BASE_CARD_TYPE_CREATE,
  payload: { data },
});

const handleBaseCardTypeCreate = (baseCardType) => ({
  type: EntryActionTypes.BASE_CARD_TYPE_CREATE_HANDLE,
  payload: { baseCardType },
});

const updateBaseCardType = (id, data) => ({
  type: EntryActionTypes.BASE_CARD_TYPE_UPDATE,
  payload: { id, data },
});

const handleBaseCardTypeUpdate = (baseCardType) => ({
  type: EntryActionTypes.BASE_CARD_TYPE_UPDATE_HANDLE,
  payload: { baseCardType },
});

const deleteBaseCardType = (id) => ({
  type: EntryActionTypes.BASE_CARD_TYPE_DELETE,
  payload: { id },
});

const handleBaseCardTypeDelete = (baseCardType) => ({
  type: EntryActionTypes.BASE_CARD_TYPE_DELETE_HANDLE,
  payload: { baseCardType },
});

const fetchBaseCardTypes = () => ({
  type: EntryActionTypes.BASE_CARD_TYPES_FETCH,
});

export default {
  createBaseCardType,
  handleBaseCardTypeCreate,
  updateBaseCardType,
  handleBaseCardTypeUpdate,
  deleteBaseCardType,
  handleBaseCardTypeDelete,
  fetchBaseCardTypes,
};
