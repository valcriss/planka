exports.up = async (knex) => {
  await knex.schema.table('epic', (table) => {
    table.text('icon');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('epic', (table) => {
    table.dropColumn('icon');
  });
};
