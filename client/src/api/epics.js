import socket from './socket';

/* Transformers */

export const transformEpic = (epic) => ({
  ...epic,
  ...(epic.startDate && { startDate: new Date(epic.startDate) }),
  ...(epic.endDate && { endDate: new Date(epic.endDate) }),
});

export const transformEpicData = (data) => ({
  ...data,
  ...(data.startDate && { startDate: data.startDate.toISOString() }),
  ...(data.endDate && { endDate: data.endDate.toISOString() }),
});

const getEpics = (projectId, headers) =>
  socket.get(`/projects/${projectId}/epics`, headers).then((body) => ({
    ...body,
    items: body.items.map(transformEpic),
  }));
const createEpic = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/epics`, transformEpicData(data), headers).then((body) => ({
    ...body,
    item: transformEpic(body.item),
  }));
const updateEpic = (id, data, headers) =>
  socket.patch(`/epics/${id}`, transformEpicData(data), headers).then((body) => ({
    ...body,
    item: transformEpic(body.item),
  }));
const deleteEpic = (id, headers) =>
  socket.delete(`/epics/${id}`, undefined, headers).then((body) => ({
    ...body,
    item: transformEpic(body.item),
  }));

export default { getEpics, createEpic, updateEpic, deleteEpic };
