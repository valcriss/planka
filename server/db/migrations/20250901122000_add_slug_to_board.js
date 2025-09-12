exports.up = async (knex) => {
  await knex.schema.table('board', (table) => {
    table.text('slug');
  });

  const boards = await knex('board').select('id', 'project_id', 'name');
  const slugsByProject = {};

  const makeSlug = (name) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'board';

  // eslint-disable-next-line no-restricted-syntax
  for (const board of boards) {
    const base = makeSlug(board.name);
    let slug = base;
    let counter = 1;
    slugsByProject[board.project_id] = slugsByProject[board.project_id] || new Set();

    while (slugsByProject[board.project_id].has(slug)) {
      slug = `${base}-${counter}`;
      counter += 1;
    }

    slugsByProject[board.project_id].add(slug);

    // eslint-disable-next-line no-await-in-loop
    await knex('board').where({ id: board.id }).update({ slug });
  }

  await knex.schema.alterTable('board', (table) => {
    table.text('slug').notNullable().alter();
    table.unique(['project_id', 'slug']);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('board', (table) => {
    table.dropUnique(['project_id', 'slug']);
  });

  await knex.schema.table('board', (table) => {
    table.dropColumn('slug');
  });
};
