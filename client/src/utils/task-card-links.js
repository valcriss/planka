/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import Paths from '../constants/Paths';

export const TASK_CARD_LINK_REGEX = /\/cards\/([^/\s]+)(?:\/([^/\s]+))?/g;

export const getTaskCardLinks = (text) =>
  Array.from(String(text || '').matchAll(TASK_CARD_LINK_REGEX)).map(([, firstPart, secondPart]) => {
    if (secondPart) {
      const number = Number(secondPart);

      if (!Number.isNaN(number)) {
        return {
          projectCode: firstPart,
          number,
        };
      }
    }

    return {
      id: firstPart,
    };
  });

export const hasTaskCardLinks = (text) => getTaskCardLinks(text).length > 0;

export const buildTaskCardLink = (projectCode, number) =>
  Paths.CARDS.replace(':projectCode', projectCode).replace(':number', number);

export default {
  TASK_CARD_LINK_REGEX,
  getTaskCardLinks,
  hasTaskCardLinks,
  buildTaskCardLink,
};
