/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const initKnex = require('knex');

const knexfile = require('../../../db/knexfile');

module.exports = {
  inputs: {
    knex: {
      type: 'ref',
    },
    tableName: {
      type: 'string',
      required: true,
    },
    columnName: {
      type: 'string',
      required: true,
    },
    columnDefinition: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    const { knex: providedKnex, tableName, columnName, columnDefinition } = inputs;

    const knex = providedKnex || initKnex(knexfile);

    try {
      const hasColumn = await knex.schema.hasColumn(tableName, columnName);

      if (!hasColumn) {
        await knex.schema.table(tableName, columnDefinition);
      }
    } finally {
      if (!providedKnex) {
        await knex.destroy();
      }
    }
  },
};
