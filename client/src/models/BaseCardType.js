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
    hasDescription: attr({ getDefault: () => true }),
    hasDueDate: attr({ getDefault: () => true }),
    hasStopwatch: attr({ getDefault: () => true }),
    hasMembers: attr({ getDefault: () => true }),
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
      case ActionTypes.BASE_CARD_TYPE_CREATE_HANDLE:
      case ActionTypes.BASE_CARD_TYPE_UPDATE_HANDLE:
      case ActionTypes.BASE_CARD_TYPE_DELETE_HANDLE:
        if (payload.baseCardType) {
          BaseCardType.upsert(payload.baseCardType);
        }
        break;
      default:
    }
  }
}
