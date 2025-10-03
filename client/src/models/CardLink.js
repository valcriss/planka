/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { attr, fk } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

export default class extends BaseModel {
  static modelName = 'CardLink';

  static fields = {
    id: attr(),
    type: attr(),
    cardId: fk({
      to: 'Card',
      as: 'card',
      relatedName: 'outgoingCardLinks',
    }),
    linkedCardId: fk({
      to: 'Card',
      as: 'linkedCard',
      relatedName: 'incomingCardLinks',
    }),
    createdAt: attr({
      getDefault: () => new Date(),
    }),
    updatedAt: attr({
      getDefault: () => new Date(),
    }),
  };

  static reducer({ type, payload }, CardLink) {
    switch (type) {
      case ActionTypes.LOCATION_CHANGE_HANDLE:
      case ActionTypes.CORE_INITIALIZE:
      case ActionTypes.USER_UPDATE_HANDLE:
      case ActionTypes.PROJECT_UPDATE_HANDLE:
      case ActionTypes.PROJECT_MANAGER_CREATE_HANDLE:
      case ActionTypes.BOARD_MEMBERSHIP_CREATE_HANDLE:
      case ActionTypes.CARD_UPDATE_HANDLE:
        if (payload.cardLinks) {
          payload.cardLinks.forEach((cardLink) => {
            CardLink.upsert(cardLink);
          });
        }

        break;
      case ActionTypes.SOCKET_RECONNECT_HANDLE:
        CardLink.all().delete();

        if (payload.cardLinks) {
          payload.cardLinks.forEach((cardLink) => {
            CardLink.upsert(cardLink);
          });
        }

        break;
      case ActionTypes.BOARD_FETCH__SUCCESS:
      case ActionTypes.CARDS_FETCH__SUCCESS:
      case ActionTypes.CARD_CREATE_HANDLE:
      case ActionTypes.CARD_DUPLICATE__SUCCESS:
        if (payload.cardLinks) {
          payload.cardLinks.forEach((cardLink) => {
            CardLink.upsert(cardLink);
          });
        }

        break;
      case ActionTypes.CARD_LINK_CREATE:
        break;
      case ActionTypes.CARD_LINK_CREATE__SUCCESS:
      case ActionTypes.CARD_LINK_CREATE_HANDLE:
        CardLink.upsert(payload.cardLink);

        break;
      case ActionTypes.CARD_LINK_DELETE:
        {
          const cardLinkModel = CardLink.withId(payload.id);

          if (cardLinkModel) {
            cardLinkModel.delete();
          }
        }

        break;
      case ActionTypes.CARD_LINK_DELETE__SUCCESS:
      case ActionTypes.CARD_LINK_DELETE_HANDLE: {
        const cardLinkModel = CardLink.withId(payload.cardLink.id);

        if (cardLinkModel) {
          cardLinkModel.delete();
        }

        break;
      }
      case ActionTypes.CARD_DELETE:
      case ActionTypes.CARD_DELETE__SUCCESS:
      case ActionTypes.CARD_DELETE_HANDLE: {
        const cardIds = [];

        if (payload.id) {
          cardIds.push(payload.id);
        }

        if (payload.card) {
          cardIds.push(payload.card.id);
        }

        if (cardIds.length > 0) {
          CardLink.all()
            .toModelArray()
            .forEach((cardLinkModel) => {
              if (
                cardIds.includes(cardLinkModel.cardId) ||
                cardIds.includes(cardLinkModel.linkedCardId)
              ) {
                cardLinkModel.delete();
              }
            });
        }

        break;
      }
      default:
    }
  }
}
