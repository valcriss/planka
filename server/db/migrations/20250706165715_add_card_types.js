/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.createTable('base_card_type', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.text('name').notNullable();
    table.text('icon');
    table.text('color');
    table.boolean('has_stopwatch').notNullable().defaultTo(true);
    table.boolean('has_tasklist').notNullable().defaultTo(true);
    table.boolean('can_link_cards').notNullable().defaultTo(true);
    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);
  });

  await knex.schema.createTable('card_type', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable();
    table.bigInteger('base_card_type_id').notNullable();
    table.text('name').notNullable();
    table.text('icon');
    table.text('color');
    table.boolean('has_stopwatch').notNullable().defaultTo(true);
    table.boolean('has_tasklist').notNullable().defaultTo(true);
    table.boolean('can_link_cards').notNullable().defaultTo(true);
    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);
    table.index('project_id');
    table.index('base_card_type_id');
  });

  await knex.schema.table('board', (table) => {
    table.bigInteger('default_card_type_id');
  });

  await knex.schema.table('card', (table) => {
    table.bigInteger('card_type_id');
  });

  // Initial base types
  const [projectBase] = await knex('base_card_type').insert(
    { name: 'project', created_at: knex.fn.now(), updated_at: knex.fn.now() },
    ['id'],
  );
  const [storyBase] = await knex('base_card_type').insert(
    { name: 'story', created_at: knex.fn.now(), updated_at: knex.fn.now() },
    ['id'],
  );

  const projects = await knex('project').select('id');
  /* eslint-disable no-await-in-loop, no-restricted-syntax */
  for (const { id } of projects) {
    const [projectType] = await knex('card_type').insert(
      {
        project_id: id,
        base_card_type_id: projectBase.id,
        name: 'project',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      ['id'],
    );
    const [storyType] = await knex('card_type').insert(
      {
        project_id: id,
        base_card_type_id: storyBase.id,
        name: 'story',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      ['id'],
    );

    await knex('board')
      .where({ project_id: id, default_card_type: 'project' })
      .update({ default_card_type_id: projectType.id });
    await knex('board')
      .where({ project_id: id, default_card_type: 'story' })
      .update({ default_card_type_id: storyType.id });

    await knex.raw(
      `UPDATE card SET card_type_id = ? FROM board WHERE card.board_id = board.id AND board.project_id = ? AND card.type = 'project'`,
      [projectType.id, id],
    );
    await knex.raw(
      `UPDATE card SET card_type_id = ? FROM board WHERE card.board_id = board.id AND board.project_id = ? AND card.type = 'story'`,
      [storyType.id, id],
    );
  }
  /* eslint-enable no-await-in-loop, no-restricted-syntax */
};

exports.down = async (knex) => {
  await knex.schema.table('card', (table) => {
    table.dropColumn('card_type_id');
  });
  await knex.schema.table('board', (table) => {
    table.dropColumn('default_card_type_id');
  });
  await knex.schema.dropTable('card_type');
  await knex.schema.dropTable('base_card_type');
};
