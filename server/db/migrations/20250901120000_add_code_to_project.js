exports.up = async (knex) => {
  await knex.schema.table('project', (table) => {
    table.text('code');
  });

  await knex.raw(`
    UPDATE project SET code = 'PRJ-' || id;
  `);

  await knex.schema.alterTable('project', (table) => {
    table.text('code').notNullable().alter();
    table.unique('code');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('project', (table) => {
    table.dropUnique('code');
  });

  await knex.schema.table('project', (table) => {
    table.dropColumn('code');
  });
};
