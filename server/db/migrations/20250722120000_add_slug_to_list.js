exports.up = async (knex) => {
  await knex.schema.table('list', (table) => {
    table.text('slug');
  });

  await knex.schema.alterTable('list', (table) => {
    table.unique(['board_id', 'slug']);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('list', (table) => {
    table.dropUnique(['board_id', 'slug']);
  });

  await knex.schema.table('list', (table) => {
    table.dropColumn('slug');
  });
};
