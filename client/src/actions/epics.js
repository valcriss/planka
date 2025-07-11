import ActionTypes from '../constants/ActionTypes';

const createEpic = (projectId, epic) => ({
  type: ActionTypes.EPIC_CREATE,
  payload: { projectId, epic },
});
createEpic.success = (localId, epic) => ({
  type: ActionTypes.EPIC_CREATE__SUCCESS,
  payload: { localId, epic },
});
createEpic.failure = (localId, error) => ({
  type: ActionTypes.EPIC_CREATE__FAILURE,
  payload: { localId, error },
});

const handleEpicCreate = (epic) => ({
  type: ActionTypes.EPIC_CREATE_HANDLE,
  payload: { epic },
});

const updateEpic = (id, data) => ({
  type: ActionTypes.EPIC_UPDATE,
  payload: { id, data },
});
updateEpic.success = (epic) => ({
  type: ActionTypes.EPIC_UPDATE__SUCCESS,
  payload: { epic },
});
updateEpic.failure = (id, error) => ({
  type: ActionTypes.EPIC_UPDATE__FAILURE,
  payload: { id, error },
});

const handleEpicUpdate = (epic) => ({
  type: ActionTypes.EPIC_UPDATE_HANDLE,
  payload: { epic },
});

const deleteEpic = (id) => ({
  type: ActionTypes.EPIC_DELETE,
  payload: { id },
});
deleteEpic.success = (epic) => ({
  type: ActionTypes.EPIC_DELETE__SUCCESS,
  payload: { epic },
});
deleteEpic.failure = (id, error) => ({
  type: ActionTypes.EPIC_DELETE__FAILURE,
  payload: { id, error },
});

const handleEpicDelete = (epic) => ({
  type: ActionTypes.EPIC_DELETE_HANDLE,
  payload: { epic },
});

export default {
  createEpic,
  handleEpicCreate,
  updateEpic,
  handleEpicUpdate,
  deleteEpic,
  handleEpicDelete,
};
