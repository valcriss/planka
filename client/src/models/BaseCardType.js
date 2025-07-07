/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { attr } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

export default class extends BaseModel {
  static modelName = 'BaseCardType';

  static fields = {
    id: attr(),
    name: attr(),
    icon: attr(),
    color: attr(),
    hasStopwatch: attr({ getDefault: () => true }),
    hasTaskList: attr({ getDefault: () => true }),
    canLinkCards: attr({ getDefault: () => true }),
  };

  static reducer({ type, payload }, BaseCardType) {
    switch (type) {
      case ActionTypes.SOCKET_RECONNECT_HANDLE:
        BaseCardType.all().delete();
        if (payload.baseCardTypes) {
          payload.baseCardTypes.forEach((item) => {
            BaseCardType.upsert(item);
          });
        }
        break;
      case ActionTypes.CORE_INITIALIZE:
      case ActionTypes.PROJECT_CREATE_HANDLE:
        if (payload.baseCardTypes) {
          payload.baseCardTypes.forEach((item) => {
            BaseCardType.upsert(item);
          });
        }
        break;
      case ActionTypes.BASE_CARD_TYPES_FETCH__SUCCESS:
        payload.baseCardTypes.forEach((item) => {
          BaseCardType.upsert(item);
        });
        break;
      case ActionTypes.BASE_CARD_TYPE_CREATE:
        BaseCardType.upsert(payload.baseCardType);
        break;
      case ActionTypes.BASE_CARD_TYPE_CREATE_HANDLE:
      case ActionTypes.BASE_CARD_TYPE_UPDATE_HANDLE:
      case ActionTypes.BASE_CARD_TYPE_DELETE_HANDLE:
        if (payload.baseCardType) {
          BaseCardType.upsert(payload.baseCardType);
        }
        break;
      case ActionTypes.BASE_CARD_TYPE_CREATE__SUCCESS:
        BaseCardType.withId(payload.localId).delete();
        BaseCardType.upsert(payload.baseCardType);
        break;
      case ActionTypes.BASE_CARD_TYPE_CREATE__FAILURE:
        BaseCardType.withId(payload.localId).delete();
        break;
      case ActionTypes.BASE_CARD_TYPE_UPDATE:
        BaseCardType.withId(payload.id).update(payload.data);
        break;
      case ActionTypes.BASE_CARD_TYPE_DELETE:
        BaseCardType.withId(payload.id).delete();
        break;
      case ActionTypes.BASE_CARD_TYPE_DELETE__SUCCESS:
      case ActionTypes.BASE_CARD_TYPE_DELETE_HANDLE: {
        const model = BaseCardType.withId(payload.baseCardType.id);

        if (model) {
          model.delete();
        }

        break;
      }
      default:
    }
  }
}
