import { createSelector } from 'redux-orm';
import orm from '../orm';
import { isLocalId } from '../utils/local-id';

export const makeSelectEpicById = () =>
  createSelector(orm, (_, id) => id, ({ Epic }, id) => {
    const model = Epic.withId(id);
    if (!model) return model;
    return { ...model.ref, isPersisted: !isLocalId(model.id) };
  });

export const selectEpicById = makeSelectEpicById();

export const makeSelectEpicIdsByProjectId = () =>
  createSelector(orm, (_, projectId) => projectId, ({ Epic }, projectId) => {
    if (!projectId) return projectId;
    return Epic.filter({ projectId })
      .toRefArray()
      .map((e) => e.id);
  });

export const selectEpicIdsByProjectId = makeSelectEpicIdsByProjectId();

export default { makeSelectEpicById, selectEpicById, makeSelectEpicIdsByProjectId, selectEpicIdsByProjectId };
