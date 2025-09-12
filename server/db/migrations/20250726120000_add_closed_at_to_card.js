exports.up = async (knex) => {
  await knex.schema.table('card', (table) => {
    table.timestamp('closed_at', true);
  });
};

exports.down = (knex) =>
  knex.schema.table('card', (table) => {
    table.dropColumn('closed_at');
  });
