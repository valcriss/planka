/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socket from './socket';

/* Transformers */

export const transformCardLink = (cardLink) => ({
  ...cardLink,
  ...(cardLink.createdAt && {
    createdAt: new Date(cardLink.createdAt),
  }),
  ...(cardLink.updatedAt && {
    updatedAt: new Date(cardLink.updatedAt),
  }),
});

/* Actions */

const createCardLink = (cardId, data, headers) =>
  socket.post(`/cards/${cardId}/card-links`, data, headers).then((body) => ({
    ...body,
    item: transformCardLink(body.item),
  }));

const deleteCardLink = (id, headers) =>
  socket.delete(`/card-links/${id}`, undefined, headers).then((body) => ({
    ...body,
    item: transformCardLink(body.item),
  }));

const searchCardsForLink = (boardId, params, headers) =>
  socket.get(`/boards/${boardId}/card-links/search`, params, headers);

export default {
  createCardLink,
  deleteCardLink,
  searchCardsForLink,
};
