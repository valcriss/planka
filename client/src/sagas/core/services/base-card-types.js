/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put } from 'redux-saga/effects';

import request from '../request';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';

export function* createBaseCardType(data) {
  const localId = yield call(createLocalId);

  yield put(
    actions.createBaseCardType({
      ...data,
      id: localId,
    }),
  );

  let baseCardType;
  try {
    ({ item: baseCardType } = yield call(request, api.createBaseCardType, data));
  } catch (error) {
    yield put(actions.createBaseCardType.failure(localId, error));
    return;
  }

  yield put(actions.createBaseCardType.success(localId, baseCardType));
}

export function* handleBaseCardTypeCreate(baseCardType) {
  yield put(actions.handleBaseCardTypeCreate(baseCardType));
}

export function* updateBaseCardType(id, data) {
  yield put(actions.updateBaseCardType(id, data));

  let baseCardType;
  try {
    ({ item: baseCardType } = yield call(request, api.updateBaseCardType, id, data));
  } catch (error) {
    yield put(actions.updateBaseCardType.failure(id, error));
    return;
  }

  yield put(actions.updateBaseCardType.success(baseCardType));
}

export function* handleBaseCardTypeUpdate(baseCardType) {
  yield put(actions.handleBaseCardTypeUpdate(baseCardType));
}

export function* deleteBaseCardType(id) {
  yield put(actions.deleteBaseCardType(id));

  let baseCardType;
  try {
    ({ item: baseCardType } = yield call(request, api.deleteBaseCardType, id));
  } catch (error) {
    yield put(actions.deleteBaseCardType.failure(id, error));
    return;
  }

  yield put(actions.deleteBaseCardType.success(baseCardType));
}

export function* handleBaseCardTypeDelete(baseCardType) {
  yield put(actions.handleBaseCardTypeDelete(baseCardType));
}

export function* fetchBaseCardTypes() {
  let baseCardTypes;
  try {
    ({ items: baseCardTypes } = yield call(request, api.getBaseCardTypes));
  } catch (error) {
    yield put(actions.fetchBaseCardTypes.failure(error));
    return;
  }

  yield put(actions.fetchBaseCardTypes.success(baseCardTypes));
}

export default {
  createBaseCardType,
  handleBaseCardTypeCreate,
  updateBaseCardType,
  handleBaseCardTypeUpdate,
  deleteBaseCardType,
  handleBaseCardTypeDelete,
  fetchBaseCardTypes,
};
