/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.table('project', (table) => {
    table.boolean('use_story_points').notNullable().defaultTo(false);
  });
};

exports.down = (knex) =>
  knex.schema.table('project', (table) => {
    table.dropColumn('use_story_points');
  });
