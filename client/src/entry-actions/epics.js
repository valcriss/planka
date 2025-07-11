import EntryActionTypes from '../constants/EntryActionTypes';

const createEpicInCurrentProject = (data) => ({
  type: EntryActionTypes.EPIC_IN_CURRENT_PROJECT_CREATE,
  payload: { data },
});

const handleEpicCreate = (epic) => ({
  type: EntryActionTypes.EPIC_CREATE_HANDLE,
  payload: { epic },
});

const updateEpic = (id, data) => ({
  type: EntryActionTypes.EPIC_UPDATE,
  payload: { id, data },
});

const handleEpicUpdate = (epic) => ({
  type: EntryActionTypes.EPIC_UPDATE_HANDLE,
  payload: { epic },
});

const deleteEpic = (id) => ({
  type: EntryActionTypes.EPIC_DELETE,
  payload: { id },
});

const handleEpicDelete = (epic) => ({
  type: EntryActionTypes.EPIC_DELETE_HANDLE,
  payload: { epic },
});

export default { createEpicInCurrentProject, handleEpicCreate, updateEpic, handleEpicUpdate, deleteEpic, handleEpicDelete };
