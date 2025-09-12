/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put, select } from 'redux-saga/effects';

import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';

export function* createCardType(projectId, data) {
  const localId = yield call(createLocalId);

  yield put(actions.createCardType(projectId, { ...data, id: localId }));

  let cardType;
  try {
    ({ item: cardType } = yield call(request, api.createCardType, projectId, data));
  } catch (error) {
    yield put(actions.createCardType.failure(localId, error));
    return;
  }

  yield put(actions.createCardType.success(localId, cardType));
}

export function* createCardTypeInCurrentProject(data) {
  const { projectId } = yield select(selectors.selectPath);
  yield call(createCardType, projectId, data);
}

export function* handleCardTypeCreate(cardType) {
  yield put(actions.handleCardTypeCreate(cardType));
}

export function* updateCardType(id, data) {
  yield put(actions.updateCardType(id, data));

  let cardType;
  try {
    ({ item: cardType } = yield call(request, api.updateCardType, id, data));
  } catch (error) {
    yield put(actions.updateCardType.failure(id, error));
    return;
  }

  yield put(actions.updateCardType.success(cardType));
}

export function* handleCardTypeUpdate(cardType) {
  yield put(actions.handleCardTypeUpdate(cardType));
}

export function* deleteCardType(id) {
  yield put(actions.deleteCardType(id));

  let cardType;
  try {
    ({ item: cardType } = yield call(request, api.deleteCardType, id));
  } catch (error) {
    yield put(actions.deleteCardType.failure(id, error));
    return;
  }

  yield put(actions.deleteCardType.success(cardType));
}

export function* handleCardTypeDelete(cardType) {
  yield put(actions.handleCardTypeDelete(cardType));
}

export function* fetchCardTypes(projectId) {
  let cardTypes;
  try {
    ({ items: cardTypes } = yield call(request, api.getCardTypes, projectId));
  } catch (error) {
    yield put(actions.fetchCardTypes.failure(projectId, error));
    return;
  }

  yield put(actions.fetchCardTypes.success(projectId, cardTypes));
}

export default {
  createCardType,
  createCardTypeInCurrentProject,
  handleCardTypeCreate,
  updateCardType,
  handleCardTypeUpdate,
  deleteCardType,
  handleCardTypeDelete,
  fetchCardTypes,
};
