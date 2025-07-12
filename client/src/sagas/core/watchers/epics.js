import { all, takeEvery } from 'redux-saga/effects';
import services from '../services';
import EntryActionTypes from '../../../constants/EntryActionTypes';

export default function* epicsWatchers() {
  yield all([
    takeEvery(EntryActionTypes.EPIC_IN_CURRENT_PROJECT_CREATE, ({ payload: { data } }) =>
      services.createEpicInCurrentProject(data),
    ),
    takeEvery(EntryActionTypes.EPIC_CREATE_HANDLE, ({ payload: { epic } }) =>
      services.handleEpicCreate(epic),
    ),
    takeEvery(EntryActionTypes.EPIC_UPDATE, ({ payload: { id, data } }) =>
      services.updateEpic(id, data),
    ),
    takeEvery(EntryActionTypes.EPIC_UPDATE_HANDLE, ({ payload: { epic } }) =>
      services.handleEpicUpdate(epic),
    ),
    takeEvery(EntryActionTypes.EPIC_DELETE, ({ payload: { id } }) => services.deleteEpic(id)),
    takeEvery(EntryActionTypes.EPIC_DELETE_HANDLE, ({ payload: { epic } }) =>
      services.handleEpicDelete(epic),
    ),
    takeEvery(EntryActionTypes.EPICS_FETCH, ({ payload: { projectId } }) =>
      services.fetchEpics(projectId),
    ),
  ]);
}
