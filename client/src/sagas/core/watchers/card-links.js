/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, takeEvery } from 'redux-saga/effects';

import services from '../services';
import EntryActionTypes from '../../../constants/EntryActionTypes';

export default function* cardLinksWatchers() {
  yield all([
    takeEvery(EntryActionTypes.CARD_LINK_CREATE, ({ payload: { cardId, linkedCardId, type } }) =>
      services.createCardLink(cardId, linkedCardId, type),
    ),
    takeEvery(EntryActionTypes.CARD_LINK_CREATE_HANDLE, ({ payload: { cardLink } }) =>
      services.handleCardLinkCreate(cardLink),
    ),
    takeEvery(EntryActionTypes.CARD_LINK_DELETE, ({ payload: { id } }) =>
      services.deleteCardLink(id),
    ),
    takeEvery(EntryActionTypes.CARD_LINK_DELETE_HANDLE, ({ payload: { cardLink } }) =>
      services.handleCardLinkDelete(cardLink),
    ),
    takeEvery(EntryActionTypes.CARD_LINKS_SEARCH, ({ payload: { boardId, cardId, search } }) =>
      services.searchCardsForLink(boardId, cardId, search),
    ),
  ]);
}
