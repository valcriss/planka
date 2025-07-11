exports.up = async (knex) => {
  await knex.schema.createTable('epic', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable();
    table.integer('position').notNullable();
    table.text('name').notNullable();
    table.text('description');
    table.text('color');
    table.timestamp('start_date', true);
    table.timestamp('end_date', true);
    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);
    table.index('project_id');
  });
};

exports.down = (knex) => knex.schema.dropTable('epic');
