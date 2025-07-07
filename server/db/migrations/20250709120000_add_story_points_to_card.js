/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.table('card', (table) => {
    table.integer('story_points').notNullable().defaultTo(0);
  });
};
exports.down = (knex) =>
  knex.schema.table('card', (table) => {
    table.dropColumn('story_points');
  });
