/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const LIMIT = 20;

const Errors = {
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
  CARD_NOT_FOUND: {
    cardNotFound: 'Card not found',
  },
};

module.exports = {
  inputs: {
    boardId: {
      ...idInput,
      required: true,
    },
    cardId: {
      ...idInput,
      required: true,
    },
    search: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 256,
      required: true,
    },
  },

  exits: {
    boardNotFound: {
      responseType: 'notFound',
    },
    cardNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { board } = await sails.helpers.boards
      .getPathToProjectById(inputs.boardId)
      .intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND);

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.BOARD_NOT_FOUND; // Forbidden
    }

    const card = await Card.qm.getOneById(inputs.cardId);

    if (!card || card.boardId !== board.id) {
      throw Errors.CARD_NOT_FOUND;
    }

    const boardMemberships = await BoardMembership.qm.getByUserId(currentUser.id);
    const availableBoardIds = _.uniq(
      boardMemberships.map(({ boardId }) => boardId).filter((boardId) => !_.isNil(boardId)),
    );

    if (availableBoardIds.length === 0) {
      return {
        items: [],
        included: {
          lists: [],
          boards: [],
          projects: [],
        },
      };
    }

    const existingCardLinks = await CardLink.qm.getForCardId(card.id);

    const excludedCardIds = new Set([card.id]);

    existingCardLinks.forEach((cardLink) => {
      if (cardLink.cardId !== card.id) {
        excludedCardIds.add(cardLink.cardId);
      }

      if (cardLink.linkedCardId !== card.id) {
        excludedCardIds.add(cardLink.linkedCardId);
      }
    });

    const values = [availableBoardIds];
    let query = `
      SELECT card.* FROM card
      JOIN board ON board.id = card.board_id
      JOIN project ON project.id = board.project_id
      WHERE card.board_id = ANY($1)
    `;

    excludedCardIds.forEach((excludedCardId) => {
      values.push(excludedCardId);
      query += ` AND card.id <> $${values.length}`;
    });

    const search = inputs.search.trim();

    if (search.length > 0) {
      const conditions = [];

      const projectCodeAndNumberMatch = search.match(/^([A-Za-z0-9_]+)-(\d+)$/);

      if (projectCodeAndNumberMatch) {
        values.push(projectCodeAndNumberMatch[1]);
        values.push(Number.parseInt(projectCodeAndNumberMatch[2], 10));
        conditions.push(
          `(project.code ILIKE $${values.length - 1} AND card.number = $${values.length})`,
        );
      }

      if (search.startsWith('#')) {
        const number = Number.parseInt(search.slice(1), 10);

        if (!Number.isNaN(number)) {
          values.push(number);
          conditions.push(`card.number = $${values.length}`);
        }
      }

      if (conditions.length === 0) {
        values.push(`%${search}%`);
        conditions.push(`card.name ILIKE $${values.length}`);

        values.push(`%${search}%`);
        conditions.push(`card.description ILIKE $${values.length}`);

        const number = Number.parseInt(search, 10);

        if (!Number.isNaN(number)) {
          values.push(number);
          conditions.push(`card.number = $${values.length}`);
        }

        values.push(`%${search}%`);
        conditions.push(`(project.code || '-' || card.number::text) ILIKE $${values.length}`);
      }

      if (conditions.length > 0) {
        query += ` AND (${conditions.join(' OR ')})`;
      }
    }

    query += ` ORDER BY card.name ASC LIMIT ${LIMIT}`;

    const { rows } = await sails.sendNativeQuery(query, values);
    const cards = rows.map((row) => _.mapKeys(row, (value, key) => _.camelCase(key)));

    const listIds = _.uniq(cards.map((item) => item.listId).filter((listId) => !_.isNil(listId)));
    const lists = listIds.length > 0 ? await List.qm.getByIds(listIds) : [];

    const boardIds = _.uniq(
      cards.map((item) => item.boardId).filter((boardId) => !_.isNil(boardId)),
    );
    const boards = boardIds.length > 0 ? await Board.qm.getByIds(boardIds) : [];

    const projectIds = _.uniq(
      boards.map((item) => item.projectId).filter((projectId) => !_.isNil(projectId)),
    );
    const projects = projectIds.length > 0 ? await Project.qm.getByIds(projectIds) : [];

    return {
      items: cards,
      included: {
        lists,
        boards,
        projects,
      },
    };
  },
};
