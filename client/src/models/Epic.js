import { attr, fk } from 'redux-orm';
import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

export default class extends BaseModel {
  static modelName = 'Epic';

  static fields = {
    id: attr(),
    position: attr(),
    name: attr(),
    description: attr(),
    color: attr(),
    startDate: attr(),
    endDate: attr(),
    projectId: fk({ to: 'Project', as: 'project', relatedName: 'epics' }),
  };

  static reducer({ type, payload }, Epic) {
    switch (type) {
      case ActionTypes.LOCATION_CHANGE_HANDLE:
      case ActionTypes.CORE_INITIALIZE:
        if (payload.epics) {
          payload.epics.forEach((e) => Epic.upsert(e));
        }
        break;
      case ActionTypes.EPICS_FETCH__SUCCESS:
        payload.epics.forEach((e) => Epic.upsert(e));
        break;
      case ActionTypes.EPIC_CREATE:
      case ActionTypes.EPIC_UPDATE__SUCCESS:
      case ActionTypes.EPIC_CREATE_HANDLE:
      case ActionTypes.EPIC_UPDATE_HANDLE:
        Epic.upsert(payload.epic);
        break;
      case ActionTypes.EPIC_CREATE__SUCCESS:
        Epic.withId(payload.localId).delete();
        Epic.upsert(payload.epic);
        break;
      case ActionTypes.EPIC_CREATE__FAILURE:
        Epic.withId(payload.localId).delete();
        break;
      case ActionTypes.EPIC_UPDATE:
        Epic.withId(payload.id).update(payload.data);
        break;
      case ActionTypes.EPIC_DELETE:
        Epic.withId(payload.id).delete();
        break;
      case ActionTypes.EPIC_DELETE__SUCCESS:
      case ActionTypes.EPIC_DELETE_HANDLE:
        Epic.withId(payload.epic.id)?.delete();
        break;
      default:
    }
  }
}
