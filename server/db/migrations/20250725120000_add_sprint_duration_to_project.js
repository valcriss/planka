exports.up = async (knex) => {
  await knex.schema.table('project', (table) => {
    table.integer('sprint_duration').notNullable().defaultTo(2);
  });
};

exports.down = (knex) =>
  knex.schema.table('project', (table) => {
    table.dropColumn('sprint_duration');
  });
