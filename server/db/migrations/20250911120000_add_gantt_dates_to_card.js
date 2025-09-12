exports.up = async (knex) => {
  await knex.schema.table('card', (table) => {
    table.timestamp('gantt_start_date', true);
    table.timestamp('gantt_end_date', true);
  });
};

exports.down = (knex) =>
  knex.schema.table('card', (table) => {
    table.dropColumn('gantt_start_date');
    table.dropColumn('gantt_end_date');
  });
