exports.up = async (knex) => {
  await knex.schema.table('project', (table) => {
    table.boolean('use_epics').notNullable().defaultTo(false);
  });
};

exports.down = (knex) =>
  knex.schema.table('project', (table) => {
    table.dropColumn('use_epics');
  });
