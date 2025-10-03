/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import omit from 'lodash/omit';

import socket from './socket';
import { transformAttachment } from './attachments';
import { transformActivity } from './activities';
import { transformNotification } from './notifications';
import { transformCardLink } from './card-links';

/* Transformers */

export const transformCard = (card) => ({
  ...card,
  ...(card.dueDate && {
    dueDate: new Date(card.dueDate),
  }),
  ...(card.ganttStartDate && {
    ganttStartDate: new Date(card.ganttStartDate),
  }),
  ...(card.ganttEndDate && {
    ganttEndDate: new Date(card.ganttEndDate),
  }),
  ...(card.stopwatch && {
    stopwatch: {
      ...card.stopwatch,
      ...(card.stopwatch.startedAt && {
        startedAt: new Date(card.stopwatch.startedAt),
      }),
    },
  }),
  ...(card.createdAt && {
    createdAt: new Date(card.createdAt),
  }),
  ...(card.listChangedAt && {
    listChangedAt: new Date(card.listChangedAt),
  }),
});

export const transformCardData = (data) => ({
  ...data,
  ...(data.dueDate && {
    dueDate: data.dueDate.toISOString(),
  }),
  ...(data.ganttStartDate && {
    ganttStartDate: data.ganttStartDate.toISOString(),
  }),
  ...(data.ganttEndDate && {
    ganttEndDate: data.ganttEndDate.toISOString(),
  }),
  ...(data.stopwatch && {
    stopwatch: {
      ...data.stopwatch,
      ...(data.stopwatch.startedAt && {
        startedAt: data.stopwatch.startedAt.toISOString(),
      }),
    },
  }),
});

/* Actions */

const getCards = (listId, data, headers) =>
  socket.get(`/lists/${listId}/cards`, data, headers).then((body) => ({
    ...body,
    items: body.items.map(transformCard),
    included: {
      ...body.included,
      attachments: body.included.attachments.map(transformAttachment),
      ...(body.included.cardLinks && {
        cardLinks: body.included.cardLinks.map(transformCardLink),
      }),
      ...(body.included.linkedCards && {
        linkedCards: body.included.linkedCards.map(transformCard),
      }),
    },
  }));

const createCard = (listId, data, headers) =>
  socket.post(`/lists/${listId}/cards`, transformCardData(data), headers).then((body) => ({
    ...body,
    item: transformCard(body.item),
  }));

const getCard = (id, headers) =>
  socket.get(`/cards/${id}`, undefined, headers).then((body) => ({
    ...body,
    item: transformCard(body.item),
    included: {
      ...body.included,
      attachments: body.included.attachments.map(transformAttachment),
      ...(body.included.cardLinks && {
        cardLinks: body.included.cardLinks.map(transformCardLink),
      }),
      ...(body.included.linkedCards && {
        linkedCards: body.included.linkedCards.map(transformCard),
      }),
    },
  }));

const getCardByProjectCodeAndNumber = (projectCode, number, headers) =>
  socket.get(`/cards/${projectCode}/${number}`, undefined, headers).then((body) => ({
    ...body,
    item: transformCard(body.item),
    included: {
      ...body.included,
      attachments: body.included.attachments.map(transformAttachment),
      ...(body.included.cardLinks && {
        cardLinks: body.included.cardLinks.map(transformCardLink),
      }),
      ...(body.included.linkedCards && {
        linkedCards: body.included.linkedCards.map(transformCard),
      }),
    },
  }));

const updateCard = (id, data, headers) =>
  socket.patch(`/cards/${id}`, transformCardData(data), headers).then((body) => ({
    ...body,
    item: transformCard(body.item),
  }));

const duplicateCard = (id, data, headers) =>
  socket.post(`/cards/${id}/duplicate`, data, headers).then((body) => ({
    ...body,
    item: transformCard(body.item),
    included: {
      ...body.included,
      attachments: body.included.attachments.map(transformAttachment),
      ...(body.included.cardLinks && {
        cardLinks: body.included.cardLinks.map(transformCardLink),
      }),
      ...(body.included.linkedCards && {
        linkedCards: body.included.linkedCards.map(transformCard),
      }),
    },
  }));

const readCardNotifications = (id, headers) =>
  socket.post(`/cards/${id}/read-notifications`, undefined, headers).then((body) => ({
    ...body,
    item: transformCard(body.item),
    included: {
      ...body.included,
      notifications: body.included.notifications.map(transformNotification),
      ...(body.included.cardLinks && {
        cardLinks: body.included.cardLinks.map(transformCardLink),
      }),
      ...(body.included.linkedCards && {
        linkedCards: body.included.linkedCards.map(transformCard),
      }),
    },
  }));

const deleteCard = (id, headers) =>
  socket.delete(`/cards/${id}`, undefined, headers).then((body) => ({
    ...body,
    item: transformCard(body.item),
  }));

/* Event handlers */

const makeHandleCardsUpdate = (next) => (body) => {
  next({
    ...body,
    items: body.items.map(transformCard),
    included: body.included && {
      ...omit(body.included, 'actions'),
      activities: body.included.actions.map(transformActivity),
      ...(body.included.cardLinks && {
        cardLinks: body.included.cardLinks.map(transformCardLink),
      }),
      ...(body.included.linkedCards && {
        linkedCards: body.included.linkedCards.map(transformCard),
      }),
    },
  });
};

const makeHandleCardCreate = (next) => (body) => {
  next({
    ...body,
    item: transformCard(body.item),
  });
};

const makeHandleCardUpdate = makeHandleCardCreate;

const makeHandleCardDelete = makeHandleCardUpdate;

export default {
  getCards,
  createCard,
  getCard,
  getCardByProjectCodeAndNumber,
  updateCard,
  duplicateCard,
  readCardNotifications,
  deleteCard,
  makeHandleCardsUpdate,
  makeHandleCardCreate,
  makeHandleCardUpdate,
  makeHandleCardDelete,
};
