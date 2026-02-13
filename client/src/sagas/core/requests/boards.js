/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, select } from 'redux-saga/effects';

import request from '../request';
import selectors from '../../../selectors';
import api from '../../../api';
import mergeRecords from '../../../utils/merge-records';
import Paths from '../../../constants/Paths';

export function* fetchBoardByCurrentPath() {
  const pathsMatch = yield select(selectors.selectPathsMatch);

  let board;
  let card;
  let users1;
  let users2;
  let projects;
  let boardMemberships;
  let labels;
  let lists;
  let cards;
  let cardLinks1;
  let cardLinks2;
  let cardMemberships1;
  let cardMemberships2;
  let cardLabels1;
  let cardLabels2;
  let taskLists1;
  let taskLists2;
  let tasks1;
  let tasks2;
  let attachments1;
  let attachments2;
  let customFieldGroups1;
  let customFieldGroups2;
  let customFields1;
  let customFields2;
  let customFieldValues1;
  let customFieldValues2;
  let linkedCards1;
  let linkedCards2;
  let epics;

  if (pathsMatch) {
    let boardId;
    if (
      pathsMatch.pattern.path === Paths.BOARDS ||
      pathsMatch.pattern.path === Paths.PLANNING_POKER
    ) {
      const project = yield select(selectors.selectProjectByCode, pathsMatch.params.code);

      if (project) {
        boardId = yield select(
          selectors.selectBoardIdByProjectIdAndSlug,
          project.id,
          pathsMatch.params.slug,
        );
      }
    } else if (pathsMatch.pattern.path === Paths.CARDS) {
      ({
        item: card,
        item: { boardId },
        included: {
          users: users1,
          cardMemberships: cardMemberships1,
          cardLabels: cardLabels1,
          taskLists: taskLists1,
          tasks: tasks1,
          attachments: attachments1,
          customFieldGroups: customFieldGroups1,
          customFields: customFields1,
          customFieldValues: customFieldValues1,
          cardLinks: cardLinks1,
          linkedCards: linkedCards1,
        },
      } = yield call(
        request,
        api.getCardByProjectCodeAndNumber,
        pathsMatch.params.projectCode,
        pathsMatch.params.number,
      ));
    }

    if (boardId) {
      ({
        item: board,
        included: {
          projects,
          boardMemberships,
          labels,
          lists,
          cards,
          linkedCards: linkedCards2,
          cardLinks: cardLinks2,
          users: users2,
          cardMemberships: cardMemberships2,
          cardLabels: cardLabels2,
          taskLists: taskLists2,
          tasks: tasks2,
          attachments: attachments2,
          customFieldGroups: customFieldGroups2,
          customFields: customFields2,
          customFieldValues: customFieldValues2,
        },
      } = yield call(request, api.getBoard, boardId, true));

      const project = projects && projects[0];
      if (project && project.useEpics) {
        try {
          ({ items: epics } = yield call(request, api.getEpics, project.id));
        } catch {
          /* empty */
        }
      }
    }
  }

  return {
    board,
    card,
    boardMemberships,
    labels,
    lists,
    cards: mergeRecords(cards, linkedCards1, linkedCards2),
    projects,
    users: mergeRecords(users1, users2),
    cardMemberships: mergeRecords(cardMemberships1, cardMemberships2),
    cardLabels: mergeRecords(cardLabels1, cardLabels2),
    taskLists: mergeRecords(taskLists1, taskLists2),
    tasks: mergeRecords(tasks1, tasks2),
    attachments: mergeRecords(attachments1, attachments2),
    customFieldGroups: mergeRecords(customFieldGroups1, customFieldGroups2),
    customFields: mergeRecords(customFields1, customFields2),
    customFieldValues: mergeRecords(customFieldValues1, customFieldValues2),
    cardLinks: mergeRecords(cardLinks1, cardLinks2) || [],
    epics,
  };
}

export default {
  fetchBoardByCurrentPath,
};
