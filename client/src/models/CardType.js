/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { attr, fk } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

export default class extends BaseModel {
  static modelName = 'CardType';

  static fields = {
    id: attr(),
    name: attr(),
    icon: attr(),
    color: attr(),
    hasDescription: attr({ getDefault: () => true }),
    hasDueDate: attr({ getDefault: () => true }),
    hasStopwatch: attr({ getDefault: () => true }),
    hasMembers: attr({ getDefault: () => true }),
    projectId: fk({ to: 'Project', as: 'project', relatedName: 'cardTypes' }),
    baseCardTypeId: fk({
      to: 'BaseCardType',
      as: 'baseType',
      relatedName: 'cardTypes',
    }),
  };

  static reducer({ type, payload }, CardType) {
    switch (type) {
      case ActionTypes.SOCKET_RECONNECT_HANDLE:
        CardType.all().delete();
        if (payload.cardTypes) {
          payload.cardTypes.forEach((item) => {
            CardType.upsert(item);
          });
        }
        break;
      case ActionTypes.CORE_INITIALIZE:
      case ActionTypes.PROJECT_CREATE_HANDLE:
        if (payload.cardTypes) {
          payload.cardTypes.forEach((item) => {
            CardType.upsert(item);
          });
        }
        break;
      case ActionTypes.CARD_TYPE_CREATE_HANDLE:
      case ActionTypes.CARD_TYPE_UPDATE_HANDLE:
      case ActionTypes.CARD_TYPE_DELETE_HANDLE:
        if (payload.cardType) {
          CardType.upsert(payload.cardType);
        }
        break;
      default:
    }
  }
}
