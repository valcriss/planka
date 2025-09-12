exports.up = async (knex) => {
  await knex.schema.createTable('sprint', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable();
    table.integer('number').notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.timestamp('close_date', true);
    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);
    table.index('project_id');
    table.unique(['project_id', 'number']);
  });

  await knex.schema.createTable('sprint_card', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('sprint_id').notNullable();
    table.bigInteger('card_id').notNullable();
    table.timestamp('added_at', true).notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);
    table.index('sprint_id');
    table.index('card_id');
    table.unique(['sprint_id', 'card_id']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('sprint_card');
  await knex.schema.dropTable('sprint');
};
