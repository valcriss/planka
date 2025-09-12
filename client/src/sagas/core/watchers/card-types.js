/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, takeEvery } from 'redux-saga/effects';

import services from '../services';
import EntryActionTypes from '../../../constants/EntryActionTypes';

export default function* cardTypesWatchers() {
  yield all([
    takeEvery(EntryActionTypes.CARD_TYPE_IN_CURRENT_PROJECT_CREATE, ({ payload: { data } }) =>
      services.createCardTypeInCurrentProject(data),
    ),
    takeEvery(EntryActionTypes.CARD_TYPE_CREATE_HANDLE, ({ payload: { cardType } }) =>
      services.handleCardTypeCreate(cardType),
    ),
    takeEvery(EntryActionTypes.CARD_TYPE_UPDATE, ({ payload: { id, data } }) =>
      services.updateCardType(id, data),
    ),
    takeEvery(EntryActionTypes.CARD_TYPE_UPDATE_HANDLE, ({ payload: { cardType } }) =>
      services.handleCardTypeUpdate(cardType),
    ),
    takeEvery(EntryActionTypes.CARD_TYPE_DELETE, ({ payload: { id } }) =>
      services.deleteCardType(id),
    ),
    takeEvery(EntryActionTypes.CARD_TYPE_DELETE_HANDLE, ({ payload: { cardType } }) =>
      services.handleCardTypeDelete(cardType),
    ),
    takeEvery(EntryActionTypes.CARD_TYPES_FETCH, ({ payload: { projectId } }) =>
      services.fetchCardTypes(projectId),
    ),
  ]);
}
