/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put } from 'redux-saga/effects';

import request from '../request';
import actions from '../../../actions';
import api from '../../../api';
import { transformCard } from '../../../api/cards';

export function* createCardLink(cardId, linkedCardId, type) {
  yield put(actions.createCardLink(cardId, linkedCardId, type));

  let cardLink;
  try {
    ({ item: cardLink } = yield call(request, api.createCardLink, cardId, {
      linkedCardId,
      type,
    }));
  } catch (error) {
    yield put(actions.createCardLink.failure(cardId, linkedCardId, error));
    return;
  }

  yield put(actions.createCardLink.success(cardLink));
}

export function* handleCardLinkCreate(cardLink) {
  yield put(actions.handleCardLinkCreate(cardLink));
}

export function* deleteCardLink(id) {
  yield put(actions.deleteCardLink(id));

  let cardLink;
  try {
    ({ item: cardLink } = yield call(request, api.deleteCardLink, id));
  } catch (error) {
    yield put(actions.deleteCardLink.failure(id, error));
    return;
  }

  yield put(actions.deleteCardLink.success(cardLink));
}

export function* handleCardLinkDelete(cardLink) {
  yield put(actions.handleCardLinkDelete(cardLink));
}

export function* searchCardsForLink(boardId, cardId, search) {
  yield put(actions.searchCardsForLink(boardId, cardId, search));

  let cards;
  let lists;

  try {
    ({ items: cards, included: { lists = [] } = {} } = yield call(
      request,
      api.searchCardsForLink,
      boardId,
      {
        cardId,
        search,
      },
    ));
  } catch (error) {
    yield put(actions.searchCardsForLink.failure(boardId, cardId, search, error));
    return;
  }

  yield put(
    actions.searchCardsForLink.success(boardId, cardId, search, cards.map(transformCard), lists),
  );
}

export default {
  createCardLink,
  handleCardLinkCreate,
  deleteCardLink,
  handleCardLinkDelete,
  searchCardsForLink,
};
