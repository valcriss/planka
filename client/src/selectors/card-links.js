/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const emptySearchState = {
  query: '',
  cardIds: [],
  isFetching: false,
  error: null,
};

export const selectCardLinkSearchByCardId = ({ cardLinks: { search } }, cardId) =>
  search[cardId] || emptySearchState;

export const selectIsCardLinkCreateInProgressForCardId = ({ cardLinks: { pending } }, cardId) =>
  Boolean(pending.create[cardId]);

export const selectCardLinkDeletePendingMap = ({ cardLinks: { pending } }) => pending.delete;

export default {
  selectCardLinkSearchByCardId,
  selectIsCardLinkCreateInProgressForCardId,
  selectCardLinkDeletePendingMap,
};
