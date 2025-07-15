exports.up = async (knex) => {
  await knex.schema.createTable('repository', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable();
    table.text('name').notNullable();
    table.text('url').notNullable();
    table.text('access_token');
    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);
    table.index('project_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('repository');
};
