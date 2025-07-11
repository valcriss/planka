import socket from './socket';

const getEpics = (projectId, headers) => socket.get(`/projects/${projectId}/epics`, headers);
const createEpic = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/epics`, data, headers);
const updateEpic = (id, data, headers) => socket.patch(`/epics/${id}`, data, headers);
const deleteEpic = (id, headers) => socket.delete(`/epics/${id}`, undefined, headers);

export default { getEpics, createEpic, updateEpic, deleteEpic };
