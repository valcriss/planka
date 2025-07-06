/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, takeEvery } from 'redux-saga/effects';

import services from '../services';
import EntryActionTypes from '../../../constants/EntryActionTypes';

export default function* baseCardTypesWatchers() {
  yield all([
    takeEvery(EntryActionTypes.BASE_CARD_TYPE_CREATE, ({ payload: { data } }) =>
      services.createBaseCardType(data),
    ),
    takeEvery(
      EntryActionTypes.BASE_CARD_TYPE_CREATE_HANDLE,
      ({ payload: { baseCardType } }) =>
        services.handleBaseCardTypeCreate(baseCardType),
    ),
    takeEvery(EntryActionTypes.BASE_CARD_TYPE_UPDATE, ({ payload: { id, data } }) =>
      services.updateBaseCardType(id, data),
    ),
    takeEvery(
      EntryActionTypes.BASE_CARD_TYPE_UPDATE_HANDLE,
      ({ payload: { baseCardType } }) =>
        services.handleBaseCardTypeUpdate(baseCardType),
    ),
    takeEvery(EntryActionTypes.BASE_CARD_TYPE_DELETE, ({ payload: { id } }) =>
      services.deleteBaseCardType(id),
    ),
    takeEvery(
      EntryActionTypes.BASE_CARD_TYPE_DELETE_HANDLE,
      ({ payload: { baseCardType } }) =>
        services.handleBaseCardTypeDelete(baseCardType),
    ),
  ]);
}
