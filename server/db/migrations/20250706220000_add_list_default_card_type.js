/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.table('list', (table) => {
    table.text('default_card_type');
    table.bigInteger('default_card_type_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('list', (table) => {
    table.dropColumn('default_card_type_id');
    table.dropColumn('default_card_type');
  });
};
