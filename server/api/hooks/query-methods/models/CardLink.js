/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria, { sort = 'id' } = {}) => CardLink.find(criteria).sort(sort);

/* Query methods */

const create = (arrayOfValues) => CardLink.createEach(arrayOfValues).fetch();

const createOne = (values) => CardLink.create({ ...values }).fetch();

const getByIds = (ids) => defaultFind(ids);

const getOneById = (id) => CardLink.findOne({ id });

const getByCardId = (cardId) =>
  defaultFind({
    cardId,
  });

const getByCardIds = (cardIds) =>
  defaultFind({
    cardId: cardIds,
  });

const getByLinkedCardId = (linkedCardId) =>
  defaultFind({
    linkedCardId,
  });

const getByLinkedCardIds = (linkedCardIds) =>
  defaultFind({
    linkedCardId: linkedCardIds,
  });

const getForCardId = (cardId) =>
  defaultFind({
    or: [
      {
        cardId,
      },
      {
        linkedCardId: cardId,
      },
    ],
  });

const getForCardIds = (cardIds) =>
  defaultFind({
    or: [
      {
        cardId: cardIds,
      },
      {
        linkedCardId: cardIds,
      },
    ],
  });

const getOneByCardIds = (cardId, linkedCardId) =>
  CardLink.findOne({
    or: [
      {
        cardId,
        linkedCardId,
      },
      {
        cardId: linkedCardId,
        linkedCardId: cardId,
      },
    ],
  });

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria) => CardLink.destroy(criteria).fetch();

const deleteOne = (criteria) => CardLink.destroyOne(criteria);

module.exports = {
  create,
  createOne,
  getByIds,
  getOneById,
  getByCardId,
  getByCardIds,
  getByLinkedCardId,
  getByLinkedCardIds,
  getForCardId,
  getForCardIds,
  getOneByCardIds,
  deleteOne,
  delete: delete_,
};
