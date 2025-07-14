exports.up = async (knex) => {
  await knex.schema.table('card', (table) => {
    table.bigInteger('epic_id');
    table.index('epic_id');
  });
};

exports.down = (knex) =>
  knex.schema.table('card', (table) => {
    table.dropIndex('epic_id');
    table.dropColumn('epic_id');
  });
