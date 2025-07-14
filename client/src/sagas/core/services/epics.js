import { call, put, select } from 'redux-saga/effects';
import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';

export function* createEpic(projectId, data) {
  const localId = yield call(createLocalId);

  const nextData = {
    ...data,
    position: yield select(selectors.selectNextEpicPosition, projectId),
  };

  yield put(actions.createEpic(projectId, { ...nextData, id: localId }));

  let epic;
  try {
    ({ item: epic } = yield call(request, api.createEpic, projectId, nextData));
  } catch (error) {
    yield put(actions.createEpic.failure(localId, error));
    return;
  }

  yield put(actions.createEpic.success(localId, epic));
}

export function* createEpicInCurrentProject(data) {
  const { projectId } = yield select(selectors.selectPath);
  yield call(createEpic, projectId, data);
}

export function* handleEpicCreate(epic) {
  yield put(actions.handleEpicCreate(epic));
}

export function* updateEpic(id, data) {
  yield put(actions.updateEpic(id, data));
  let epic;
  try {
    ({ item: epic } = yield call(request, api.updateEpic, id, data));
  } catch (error) {
    yield put(actions.updateEpic.failure(id, error));
    return;
  }
  yield put(actions.updateEpic.success(epic));
}

export function* handleEpicUpdate(epic) {
  yield put(actions.handleEpicUpdate(epic));
}

export function* moveEpic(id, index) {
  const { projectId } = yield select(selectors.selectEpicById, id);
  const position = yield select(selectors.selectNextEpicPosition, projectId, index, id);

  yield call(updateEpic, id, {
    position,
  });
}

export function* deleteEpic(id) {
  yield put(actions.deleteEpic(id));
  let epic;
  try {
    ({ item: epic } = yield call(request, api.deleteEpic, id));
  } catch (error) {
    yield put(actions.deleteEpic.failure(id, error));
    return;
  }
  yield put(actions.deleteEpic.success(epic));
}

export function* handleEpicDelete(epic) {
  yield put(actions.handleEpicDelete(epic));
}

export function* fetchEpics(projectId) {
  yield put(actions.fetchEpics(projectId));

  let epics;
  try {
    ({ items: epics } = yield call(request, api.getEpics, projectId));
  } catch (error) {
    yield put(actions.fetchEpics.failure(projectId, error));
    return;
  }

  yield put(actions.fetchEpics.success(projectId, epics));
}

export function* fetchEpicsInCurrentProject() {
  const { projectId } = yield select(selectors.selectPath);
  if (projectId) {
    yield call(fetchEpics, projectId);
  }
}

export default {
  createEpic,
  createEpicInCurrentProject,
  handleEpicCreate,
  updateEpic,
  handleEpicUpdate,
  deleteEpic,
  handleEpicDelete,
  moveEpic,
  fetchEpics,
  fetchEpicsInCurrentProject,
};
