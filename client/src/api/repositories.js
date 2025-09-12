import socket from './socket';

const getRepositories = (projectId, headers) =>
  socket.get(`/projects/${projectId}/repositories`, undefined, headers);

const createRepository = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/repositories`, data, headers);

const updateRepository = (id, data, headers) => socket.patch(`/repositories/${id}`, data, headers);

const deleteRepository = (id, headers) => socket.delete(`/repositories/${id}`, undefined, headers);

export default {
  getRepositories,
  createRepository,
  updateRepository,
  deleteRepository,
};
