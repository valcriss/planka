exports.up = async (knex) => {
  await knex.schema.createTable('card_link', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('card_id').notNullable();
    table.bigInteger('linked_card_id').notNullable();
    table.string('type').notNullable();
    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);

    table.foreign('card_id').references('id').inTable('card').onDelete('CASCADE');
    table.foreign('linked_card_id').references('id').inTable('card').onDelete('CASCADE');

    table.index('card_id');
    table.index('linked_card_id');
    table.index('type');
  });

  await knex.raw(
    'ALTER TABLE card_link ADD CONSTRAINT card_link_card_id_not_equal CHECK (card_id <> linked_card_id)',
  );

  await knex.raw(
    'CREATE UNIQUE INDEX card_link_unique_pair ON card_link (LEAST(card_id, linked_card_id), GREATEST(card_id, linked_card_id))',
  );
};

exports.down = (knex) => knex.schema.dropTable('card_link');
