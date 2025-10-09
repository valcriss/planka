/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, call, fork, join, put, race, select, take } from 'redux-saga/effects';
import { LOCATION_CHANGE_HANDLE } from '../../../lib/redux-router';

import { goToBoard, goToCard } from './router';
import request from '../request';
import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import actions from '../../../actions';
import api from '../../../api';
import mergeRecords from '../../../utils/merge-records';
import { createLocalId } from '../../../utils/local-id';
import { isListArchiveOrTrash, isListFinite } from '../../../utils/record-helpers';
import parseLaneKey from '../../../utils/parse-lane-key';
import ActionTypes from '../../../constants/ActionTypes';
import { BoardSwimlaneTypes, BoardViews, ListTypes } from '../../../constants/Enums';

// eslint-disable-next-line no-underscore-dangle
const _preloadImage = (url) =>
  new Promise((resolve) => {
    const image = new Image();

    image.onload = resolve;
    image.onerror = resolve;

    image.src = url;
  });

export function* fetchCards(listId) {
  const { boardId, lastCard } = yield select(selectors.selectListById, listId);
  const { search } = yield select(selectors.selectBoardById, boardId);
  const filterUserIds = yield select(selectors.selectFilterUserIdsForCurrentBoard);
  const filterLabelIds = yield select(selectors.selectFilterLabelIdsForCurrentBoard);

  function* getCardsRequest() {
    const response = {};

    try {
      response.body = yield call(request, api.getCards, listId, {
        search: (search && search.trim()) || undefined,
        filterUserIds: filterUserIds.length > 0 ? filterUserIds.join(',') : undefined,
        filterLabelIds: filterLabelIds.length > 0 ? filterLabelIds.join(',') : undefined,
        before: lastCard || undefined,
      });
    } catch (error) {
      response.error = error;
    }

    return response;
  }

  yield put(actions.fetchCards(listId));

  const getCardsRequestTask = yield fork(getCardsRequest);

  const [response] = yield race([
    join(getCardsRequestTask),
    take((action) => action.type === ActionTypes.CARDS_FETCH && action.payload.listId === listId),
  ]);

  if (!response) {
    return;
  }

  if (response.error) {
    yield put(actions.fetchCards.failure(listId, response.error));
    return;
  }

  const {
    body: {
      items: cards,
      included: {
        users,
        cardMemberships,
        cardLabels,
        taskLists,
        tasks,
        attachments,
        customFieldGroups,
        customFields,
        customFieldValues,
        cardLinks,
        linkedCards,
      },
    },
  } = response;

  const mergedCards = mergeRecords(cards, linkedCards);

  yield put(
    actions.fetchCards.success(
      listId,
      mergedCards,
      cardLinks || [],
      users,
      cardMemberships,
      cardLabels,
      taskLists,
      tasks,
      attachments,
      customFieldGroups,
      customFields,
      customFieldValues,
    ),
  );
}

export function* fetchCardsInCurrentList() {
  const currentListId = yield select(selectors.selectCurrentListId);

  yield call(fetchCards, currentListId);
}

export function* handleCardsUpdate(cards, activities) {
  yield put(actions.handleCardsUpdate(cards, activities));
}

export function* applyLaneContextAfterCreate(card, laneContext, boardSwimlaneType) {
  if (laneContext === undefined) {
    return;
  }

  const normalizedLaneContext =
    laneContext && typeof laneContext === 'object' && laneContext.type === 'unassigned'
      ? null
      : laneContext;

  const cardId = card.id;

  if (normalizedLaneContext === null) {
    switch (boardSwimlaneType) {
      case BoardSwimlaneTypes.MEMBERS: {
        const userIds = (yield select(selectors.selectUserIdsByCardId, cardId)) || [];

        if (userIds.length > 0) {
          const removalEffects = userIds.map((userId) =>
            put(entryActions.removeUserFromCard(userId, cardId)),
          );

          yield all(removalEffects);
        }

        break;
      }
      case BoardSwimlaneTypes.LABELS: {
        const labelIds = (yield select(selectors.selectLabelIdsByCardId, cardId)) || [];

        if (labelIds.length > 0) {
          const removalEffects = labelIds.map((labelId) =>
            put(entryActions.removeLabelFromCard(labelId, cardId)),
          );

          yield all(removalEffects);
        }

        break;
      }
      case BoardSwimlaneTypes.EPICS:
        if (card.epicId !== null) {
          yield put(entryActions.updateCard(cardId, { epicId: null }));
        }

        break;
      default:
    }

    return;
  }

  if (!normalizedLaneContext || typeof normalizedLaneContext !== 'object') {
    return;
  }

  const { type = null, value = null } = normalizedLaneContext;

  switch (type) {
    case 'member':
      if (value) {
        yield put(entryActions.addUserToCard(value, cardId));
      }

      break;
    case 'label':
      if (value) {
        yield put(entryActions.addLabelToCard(value, cardId));
      }

      break;
    case 'epic': {
      const targetEpicId = value ?? null;

      if (card.epicId !== targetEpicId) {
        yield put(entryActions.updateCard(cardId, { epicId: targetEpicId }));
      }

      break;
    }
    default:
  }
}

export function* createCard(listId, data, autoOpen, laneContextParam = undefined) {
  const { laneContext: dataLaneContext, ...cardData } = data || {};
  const laneContext = laneContextParam !== undefined ? laneContextParam : dataLaneContext;

  const localId = yield call(createLocalId);
  const list = yield select(selectors.selectListById, listId);

  let boardSwimlaneType = BoardSwimlaneTypes.NONE;
  if (laneContext !== undefined) {
    const board = yield select(selectors.selectBoardById, list.boardId);
    boardSwimlaneType = board?.swimlaneType ?? BoardSwimlaneTypes.NONE;
  }

  const currentUserMembership = yield select(
    selectors.selectCurrentUserMembershipByBoardId,
    list.boardId,
  );

  const nextData = {
    ...cardData,
  };

  if (isListFinite(list)) {
    nextData.position = yield select(selectors.selectNextCardPosition, listId);
  }

  yield put(
    actions.createCard(
      {
        ...nextData,
        listId,
        id: localId,
        boardId: list.boardId,
        creatorUserId: currentUserMembership.userId,
      },
      autoOpen,
    ),
  );

  // TODO: use race instead
  let watchForCreateCardActionTask;
  if (autoOpen) {
    watchForCreateCardActionTask = yield fork(function* watchForCreateCardAction() {
      yield take((action) => action.type === ActionTypes.CARD_CREATE && action.payload.autoOpen);
    });
  }

  let card;
  try {
    ({ item: card } = yield call(request, api.createCard, listId, nextData));
  } catch (error) {
    yield put(actions.createCard.failure(localId, error));
    return;
  }

  yield put(actions.createCard.success(localId, card));

  if (laneContext !== undefined) {
    yield call(applyLaneContextAfterCreate, card, laneContext, boardSwimlaneType);
  }

  if (watchForCreateCardActionTask && watchForCreateCardActionTask.isRunning()) {
    yield call(goToCard, card.id);
  }
}

export function* createCardInCurrentList(data, autoOpen) {
  const currentListId = yield select(selectors.selectCurrentListId);

  yield call(createCard, currentListId, data, autoOpen);
}

export function* createCardInFirstFiniteList(data, autoOpen) {
  const firstFiniteListId = yield select(selectors.selectFirstFiniteListId);

  yield call(createCard, firstFiniteListId, data, autoOpen);
}

export function* handleCardCreate(card) {
  let users;
  let cardMemberships;
  let cardLabels;
  let taskLists;
  let tasks;
  let attachments;
  let customFieldGroups;
  let customFields;
  let customFieldValues;
  let cardLinks;
  let linkedCards;

  try {
    ({
      item: card, // eslint-disable-line no-param-reassign
      included: {
        users,
        cardMemberships,
        cardLabels,
        taskLists,
        tasks,
        attachments,
        customFieldGroups,
        customFields,
        customFieldValues,
        cardLinks,
        linkedCards,
      },
    } = yield call(request, api.getCard, card.id));
  } catch {
    return;
  }

  yield put(
    actions.handleCardCreate(
      card,
      cardLinks || [],
      linkedCards || [],
      users,
      cardMemberships,
      cardLabels,
      taskLists,
      tasks,
      attachments,
      customFieldGroups,
      customFields,
      customFieldValues,
    ),
  );
}

export function* updateCard(id, data) {
  let prevListId;
  if (data.listId) {
    const list = yield select(selectors.selectListById, data.listId);

    const card = yield select(selectors.selectCardById, id);
    const prevList = yield select(selectors.selectListById, card.listId);

    if (prevList.type === ListTypes.TRASH) {
      prevListId = null;
    } else if (isListArchiveOrTrash(list)) {
      prevListId = prevList.id;
    } else if (prevList.type === ListTypes.ARCHIVE) {
      prevListId = null;
    }
  }

  yield put(
    actions.updateCard(id, {
      ...data,
      ...(prevListId !== undefined && {
        prevListId,
      }),
    }),
  );

  let card;
  try {
    ({ item: card } = yield call(request, api.updateCard, id, data));
  } catch (error) {
    yield put(actions.updateCard.failure(id, error));
    return;
  }

  yield put(actions.updateCard.success(card));
}

export function* updateCurrentCard(data) {
  const { cardId } = yield select(selectors.selectPath);

  yield call(updateCard, cardId, data);
}

export function* handleCardUpdate(card) {
  const { cardId, boardId } = yield select(selectors.selectPath);

  let fetch = false;
  if (card.boardId) {
    const isAvailableForCurrentUser = yield select(
      selectors.selectIsCardWithIdAvailableForCurrentUser,
      card.id,
    );

    fetch = !isAvailableForCurrentUser;
  }

  let users;
  let cardMemberships;
  let cardLabels;
  let taskLists;
  let tasks;
  let attachments;
  let customFieldGroups;
  let customFields;
  let customFieldValues;
  let cardLinks;
  let linkedCards;

  if (fetch) {
    try {
      ({
        item: card, // eslint-disable-line no-param-reassign
        included: {
          users,
          cardMemberships,
          cardLabels,
          taskLists,
          tasks,
          attachments,
          customFieldGroups,
          customFields,
          customFieldValues,
          cardLinks,
          linkedCards,
        },
      } = yield call(request, api.getCard, card.id));
    } catch {
      fetch = false;
    }
  }

  yield put(
    actions.handleCardUpdate(
      card,
      fetch,
      cardLinks || [],
      linkedCards || [],
      users,
      cardMemberships,
      cardLabels,
      taskLists,
      tasks,
      attachments,
      customFieldGroups,
      customFields,
      customFieldValues,
    ),
  );

  if (card.boardId === null && card.id === cardId) {
    yield call(goToBoard, boardId);
  }
}

const normalizeLaneDescriptor = (lane) => {
  if (!lane) {
    return null;
  }

  if (typeof lane === 'string') {
    return parseLaneKey(lane);
  }

  if (typeof lane === 'object') {
    const { key = null, type = null, id = null } = lane;

    if (key) {
      const parsed = parseLaneKey(key);

      if (parsed) {
        return {
          key: parsed.key,
          type: type ?? parsed.type,
          id: id ?? parsed.id,
        };
      }
    }

    if (type || id) {
      let derivedKey = null;

      if (type === 'unassigned') {
        derivedKey = 'unassigned';
      } else if (type && id) {
        derivedKey = `${type}:${id}`;
      }

      if (derivedKey || type || id) {
        return {
          key: derivedKey,
          type,
          id,
        };
      }
    }
  }

  return null;
};

function* applyLaneChange(cardId, sourceLane, targetLane) {
  if (!sourceLane && !targetLane) {
    return;
  }

  const sourceKey = sourceLane?.key ?? null;
  const targetKey = targetLane?.key ?? null;

  if (sourceKey === targetKey) {
    return;
  }

  let laneType = null;

  if (targetLane?.type && targetLane.type !== 'unassigned') {
    laneType = targetLane.type;
  } else if (sourceLane?.type && sourceLane.type !== 'unassigned') {
    laneType = sourceLane.type;
  }

  switch (laneType) {
    case 'member':
      if (sourceLane?.type === 'member' && sourceLane.id) {
        yield put(entryActions.removeUserFromCard(sourceLane.id, cardId));
      }

      if (targetLane?.type === 'member' && targetLane.id) {
        yield put(entryActions.addUserToCard(targetLane.id, cardId));
      }

      break;
    case 'label':
      if (sourceLane?.type === 'label' && sourceLane.id) {
        yield put(entryActions.removeLabelFromCard(sourceLane.id, cardId));
      }

      if (targetLane?.type === 'label' && targetLane.id) {
        yield put(entryActions.addLabelToCard(targetLane.id, cardId));
      }

      break;
    case 'epic': {
      const epicId = targetLane?.type === 'epic' && targetLane.id ? targetLane.id : null;

      if (sourceLane?.type === 'epic' || targetLane?.type === 'epic') {
        yield call(updateCard, cardId, { epicId });
      }

      break;
    }
    default:
  }
}

export function* moveCard(id, listId, index, metadata = undefined) {
  const data = {};
  if (listId) {
    data.listId = listId;
  } else {
    // eslint-disable-next-line no-param-reassign
    ({ listId } = yield select(selectors.selectCardById, id));
  }

  const list = yield select(selectors.selectListById, listId);

  if (isListFinite(list)) {
    data.position = yield select(selectors.selectNextCardPosition, listId, index, id);
  }

  yield call(updateCard, id, data);

  const isMetadataObject = metadata && typeof metadata === 'object';

  const sourceLane = isMetadataObject ? normalizeLaneDescriptor(metadata.sourceLane) : null;
  const targetLane = isMetadataObject ? normalizeLaneDescriptor(metadata.targetLane) : null;

  if (sourceLane || targetLane) {
    yield call(applyLaneChange, id, sourceLane, targetLane);
  }
}

export function* moveCurrentCard(listId, index, autoClose) {
  const { cardId, boardId } = yield select(selectors.selectPath);

  if (autoClose) {
    yield call(goToBoard, boardId);
  }

  yield call(moveCard, cardId, listId, index);
}

export function* moveCardToArchive(id) {
  const archiveListId = yield select(selectors.selectArchiveListIdForCurrentBoard);

  yield call(moveCard, id, archiveListId);
}

export function* moveCurrentCardToArchive() {
  const archiveListId = yield select(selectors.selectArchiveListIdForCurrentBoard);

  yield call(moveCurrentCard, archiveListId, undefined, true);
}

export function* moveCardToTrash(id) {
  const trashListId = yield select(selectors.selectTrashListIdForCurrentBoard);

  yield call(moveCard, id, trashListId);
}

export function* moveCurrentCardToTrash() {
  const trashListId = yield select(selectors.selectTrashListIdForCurrentBoard);

  yield call(moveCurrentCard, trashListId, undefined, true);
}

export function* transferCard(id, boardId, listId, index) {
  const { cardId: currentCardId, boardId: currentBoardId } = yield select(selectors.selectPath);

  // TODO: hack?
  if (id === currentCardId) {
    yield call(goToBoard, currentBoardId);
  }

  const list = yield select(selectors.selectListById, listId);

  const data = {
    listId,
    boardId,
  };

  if (isListFinite(list)) {
    data.position = yield select(selectors.selectNextCardPosition, listId, index, id);
  }

  yield call(updateCard, id, data);
}

export function* transferCurrentCard(boardId, listId, index) {
  const { cardId } = yield select(selectors.selectPath);

  yield call(transferCard, cardId, boardId, listId, index);
}

export function* duplicateCard(id, data) {
  const localId = yield call(createLocalId);
  const { boardId, listId } = yield select(selectors.selectCardById, id);
  const index = yield select(selectors.selectCardIndexById, id);

  const currentUserMembership = yield select(
    selectors.selectCurrentUserMembershipByBoardId,
    boardId,
  );

  const nextData = {
    ...data,
    position: yield select(selectors.selectNextCardPosition, listId, index + 1),
  };

  yield put(
    actions.duplicateCard(id, localId, {
      ...nextData,
      creatorUserId: currentUserMembership.userId,
    }),
  );

  let card;
  let cardMemberships;
  let cardLabels;
  let taskLists;
  let tasks;
  let attachments;
  let customFieldGroups;
  let customFields;
  let customFieldValues;
  let cardLinks;
  let linkedCards;

  try {
    ({
      item: card,
      included: {
        cardMemberships,
        cardLabels,
        taskLists,
        tasks,
        attachments,
        customFieldGroups,
        customFields,
        customFieldValues,
        cardLinks,
        linkedCards,
      },
    } = yield call(request, api.duplicateCard, id, nextData));
  } catch (error) {
    yield put(actions.duplicateCard.failure(localId, error));
    return;
  }

  if (card.coverAttachmentId) {
    const coverAttachment = attachments.find(
      (attachment) => attachment.id === card.coverAttachmentId,
    );

    if (coverAttachment) {
      yield call(_preloadImage, coverAttachment.data.thumbnailUrls.outside360);
    }
  }

  yield put(
    actions.duplicateCard.success(
      localId,
      card,
      cardLinks || [],
      linkedCards || [],
      cardMemberships,
      cardLabels,
      taskLists,
      tasks,
      attachments,
      customFieldGroups,
      customFields,
      customFieldValues,
    ),
  );
}

export function* duplicateCurrentCard(data) {
  const { cardId } = yield select(selectors.selectPath);

  yield call(duplicateCard, cardId, data);
}

export function* goToAdjacentCard(direction) {
  const card = yield select(selectors.selectCurrentCard);
  const list = yield select(selectors.selectListById, card.listId);

  let cardIds;
  if (isListFinite(list)) {
    const { view } = yield select(selectors.selectCurrentBoard);

    if (view === BoardViews.KANBAN) {
      cardIds = yield select(selectors.selectFilteredCardIdsByListId, card.listId);
    } else {
      cardIds = yield select(selectors.selectFilteredCardIdsForCurrentBoard);
    }
  } else {
    cardIds = yield select(selectors.selectFilteredCardIdsByListId, card.listId);

    if (direction === 1 && card.id === cardIds[cardIds.length - 1]) {
      if (list.isCardsFetching || list.isAllCardsFetched) {
        return;
      }

      const [, cancelled] = yield race([call(fetchCards, list.id), take(LOCATION_CHANGE_HANDLE)]);

      if (cancelled) {
        return;
      }

      cardIds = yield select(selectors.selectFilteredCardIdsByListId, card.listId);
    }
  }

  const index = cardIds.indexOf(card.id);

  if (index === -1) {
    return;
  }

  const adjacentCardId = cardIds[index + direction];

  if (adjacentCardId) {
    yield call(goToCard, adjacentCardId);
  }
}

export function* deleteCard(id) {
  const { cardId, boardId } = yield select(selectors.selectPath);

  yield put(actions.deleteCard(id));

  if (id === cardId) {
    yield call(goToBoard, boardId);
  }

  let card;
  try {
    ({ item: card } = yield call(request, api.deleteCard, id));
  } catch (error) {
    yield put(actions.deleteCard.failure(id, error));
    return;
  }

  yield put(actions.deleteCard.success(card));
}

export function* deleteCurrentCard() {
  const { cardId } = yield select(selectors.selectPath);

  yield call(deleteCard, cardId);
}

export function* handleCardDelete(card) {
  const { cardId } = yield select(selectors.selectPath);

  yield put(actions.handleCardDelete(card));

  if (card.id === cardId) {
    yield call(goToBoard, card.boardId);
  }
}

export default {
  fetchCards,
  fetchCardsInCurrentList,
  handleCardsUpdate,
  createCard,
  createCardInCurrentList,
  handleCardCreate,
  createCardInFirstFiniteList,
  updateCard,
  updateCurrentCard,
  handleCardUpdate,
  moveCard,
  moveCurrentCard,
  moveCardToArchive,
  moveCurrentCardToArchive,
  moveCardToTrash,
  moveCurrentCardToTrash,
  transferCard,
  transferCurrentCard,
  duplicateCard,
  duplicateCurrentCard,
  goToAdjacentCard,
  deleteCard,
  deleteCurrentCard,
  handleCardDelete,
};
