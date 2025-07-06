/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * List.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const Card = require('./Card');

const Types = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  ARCHIVE: 'archive',
  TRASH: 'trash',
};

const SortFieldNames = {
  NAME: 'name',
  DUE_DATE: 'dueDate',
  CREATED_AT: 'createdAt',
};

// TODO: should not be here
const SortOrders = {
  ASC: 'asc',
  DESC: 'desc',
};

const FINITE_TYPES = [Types.ACTIVE, Types.CLOSED];

const COLORS = [
  'berry-red',
  'pumpkin-orange',
  'lagoon-blue',
  'pink-tulip',
  'light-mud',
  'orange-peel',
  'bright-moss',
  'antique-blue',
  'dark-granite',
  'turquoise-sea',
];

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

module.exports = {
  Types,
  SortFieldNames,
  SortOrders,
  FINITE_TYPES,
  COLORS,

  attributes: {
    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    type: {
      type: 'string',
      isIn: Object.values(Types),
      required: true,
    },
    position: {
      type: 'number',
      allowNull: true,
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
      allowNull: true,
    },
    defaultCardType: {
      type: 'string',
      defaultsTo: Card.Types.PROJECT,
      columnName: 'default_card_type',
    },
    defaultCardTypeId: {
      model: 'CardType',
      columnName: 'default_card_type_id',
    },
    color: {
      type: 'string',
      custom: (value) => HEX_COLOR_REGEX.test(value) || COLORS.includes(value),
      allowNull: true,
    },

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    boardId: {
      model: 'Board',
      required: true,
      columnName: 'board_id',
    },
    cards: {
      collection: 'Card',
      via: 'listId',
    },
  },
};
