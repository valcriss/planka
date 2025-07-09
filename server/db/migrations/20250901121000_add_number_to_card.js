exports.up = async (knex) => {
  await knex.schema.table('card', (table) => {
    table.integer('number');
  });

  await knex.raw(`
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER(PARTITION BY board_id ORDER BY created_at) AS rn
      FROM card
    )
    UPDATE card SET number = numbered.rn FROM numbered WHERE card.id = numbered.id;
  `);

  await knex.schema.alterTable('card', (table) => {
    table.integer('number').notNullable().alter();
    table.unique(['board_id', 'number']);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('card', (table) => {
    table.dropUnique(['board_id', 'number']);
  });

  await knex.schema.table('card', (table) => {
    table.dropColumn('number');
  });
};
