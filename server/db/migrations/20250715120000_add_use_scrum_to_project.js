exports.up = async (knex) => {
  await knex.schema.table('project', (table) => {
    table.boolean('use_scrum').notNullable().defaultTo(false);
  });
};

exports.down = (knex) =>
  knex.schema.table('project', (table) => {
    table.dropColumn('use_scrum');
  });
