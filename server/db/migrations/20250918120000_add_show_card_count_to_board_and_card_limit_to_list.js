exports.up = async (knex) => {
  await knex.schema.table('board', (table) => {
    table.boolean('show_card_count').notNullable().defaultTo(false);
  });

  await knex.schema.table('list', (table) => {
    table.integer('card_limit').notNullable().defaultTo(0);
  });
};

exports.down = async (knex) => {
  await knex.schema.table('list', (table) => {
    table.dropColumn('card_limit');
  });

  await knex.schema.table('board', (table) => {
    table.dropColumn('show_card_count');
  });
};
