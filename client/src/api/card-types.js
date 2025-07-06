/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socket from './socket';

const createCardType = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/card-types`, data, headers);

const updateCardType = (id, data, headers) =>
  socket.patch(`/card-types/${id}`, data, headers);

const deleteCardType = (id, headers) =>
  socket.delete(`/card-types/${id}`, undefined, headers);

export default {
  createCardType,
  updateCardType,
  deleteCardType,
};
