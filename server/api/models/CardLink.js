/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * CardLink.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const Types = {
  RELATES_TO: 'relatesTo',
  BLOCKS: 'blocks',
  DUPLICATES: 'duplicates',
};

module.exports = {
  Types,

  attributes: {
    type: {
      type: 'string',
      isIn: Object.values(Types),
      required: true,
    },

    cardId: {
      model: 'Card',
      required: true,
      columnName: 'card_id',
    },

    linkedCardId: {
      model: 'Card',
      required: true,
      columnName: 'linked_card_id',
    },
  },

  tableName: 'card_link',
};
