/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socket from './socket';

const getCurrentSprint = (projectId, headers) =>
  socket.get(`/projects/${projectId}/current-sprint`, undefined, headers);

const startSprint = (projectId, headers) =>
  socket.post(`/projects/${projectId}/start-sprint`, undefined, headers);

export default {
  getCurrentSprint,
  startSprint,
};
