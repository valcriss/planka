/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socket from './socket';

const getBaseCardTypes = (headers) => socket.get('/base-card-types', undefined, headers);

const createBaseCardType = (data, headers) => socket.post('/base-card-types', data, headers);

const updateBaseCardType = (id, data, headers) =>
  socket.patch(`/base-card-types/${id}`, data, headers);

const deleteBaseCardType = (id, headers) =>
  socket.delete(`/base-card-types/${id}`, undefined, headers);

export default {
  getBaseCardTypes,
  createBaseCardType,
  updateBaseCardType,
  deleteBaseCardType,
};
