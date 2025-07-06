/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import EntryActionTypes from '../constants/EntryActionTypes';

const createCardTypeInCurrentProject = (data) => ({
  type: EntryActionTypes.CARD_TYPE_IN_CURRENT_PROJECT_CREATE,
  payload: { data },
});

const handleCardTypeCreate = (cardType) => ({
  type: EntryActionTypes.CARD_TYPE_CREATE_HANDLE,
  payload: { cardType },
});

const updateCardType = (id, data) => ({
  type: EntryActionTypes.CARD_TYPE_UPDATE,
  payload: { id, data },
});

const handleCardTypeUpdate = (cardType) => ({
  type: EntryActionTypes.CARD_TYPE_UPDATE_HANDLE,
  payload: { cardType },
});

const deleteCardType = (id) => ({
  type: EntryActionTypes.CARD_TYPE_DELETE,
  payload: { id },
});

const handleCardTypeDelete = (cardType) => ({
  type: EntryActionTypes.CARD_TYPE_DELETE_HANDLE,
  payload: { cardType },
});

export default {
  createCardTypeInCurrentProject,
  handleCardTypeCreate,
  updateCardType,
  handleCardTypeUpdate,
  deleteCardType,
  handleCardTypeDelete,
};
