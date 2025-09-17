/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  PROJECT_NOT_FOUND: {
    projectNotFound: 'Project not found',
  },
  NO_IMPORT_FILE_WAS_UPLOADED: {
    noImportFileWasUploaded: 'No import file was uploaded',
  },
  INVALID_IMPORT_FILE: {
    invalidImportFile: 'Invalid import file',
  },
  CARD_TYPE_NOT_FOUND: { cardTypeNotFound: 'Card type not found' },
};

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
      required: true,
    },
    position: {
      type: 'number',
      min: 0,
      required: true,
    },
    name: {
      type: 'string',
      maxLength: 128,
      required: true,
    },
    defaultCardTypeId: {
      type: 'string',
      allowNull: true,
    },
    importType: {
      type: 'string',
      isIn: Object.values(Board.ImportTypes),
    },
    requestId: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 128,
    },
  },

  exits: {
    projectNotFound: {
      responseType: 'notFound',
    },
    noImportFileWasUploaded: {
      responseType: 'unprocessableEntity',
    },
    invalidImportFile: {
      responseType: 'unprocessableEntity',
    },
    uploadError: {
      responseType: 'unprocessableEntity',
    },
    cardTypeNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const project = await Project.qm.getOneById(inputs.projectId);

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);

    if (!isProjectManager) {
      throw Errors.PROJECT_NOT_FOUND; // Forbidden
    }

    let boardImport;
    if (inputs.importType) {
      let files;
      try {
        files = await sails.helpers.utils.receiveFile('importFile', this.req);
      } catch (error) {
        return exits.uploadError(error.message); // TODO: add error
      }

      if (files.length === 0) {
        throw Errors.NO_IMPORT_FILE_WAS_UPLOADED;
      }

      const file = _.last(files);

      if (inputs.importType === Board.ImportTypes.TRELLO) {
        const trelloBoard = await sails.helpers.boards
          .processUploadedTrelloImportFile(file)
          .intercept('invalidFile', () => Errors.INVALID_IMPORT_FILE);

        boardImport = {
          type: inputs.importType,
          board: trelloBoard,
        };
      } else if (inputs.importType === Board.ImportTypes.PLANNER) {
        const planner = await sails.helpers.boards
          .processUploadedPlannerImportFile(file)
          .intercept('invalidFile', () => Errors.INVALID_IMPORT_FILE);

        boardImport = {
          type: inputs.importType,
          planner,
        };
      }
    }

    const values = _.pick(inputs, ['position', 'name', 'defaultCardTypeId']);

    if (values.defaultCardTypeId) {
      const cardType = await sails.helpers.cardTypes.getOrCreateForProject
        .with({
          project,
          id: values.defaultCardTypeId,
          actorUser: currentUser,
          request: this.req,
        })
        .intercept('notFound', () => Errors.CARD_TYPE_NOT_FOUND);

      values.defaultCardType = cardType.name;
      values.defaultCardTypeId = cardType.id;
    }

    const { board, boardMembership } = await sails.helpers.boards.createOne.with({
      values: {
        ...values,
        project,
      },
      import: boardImport,
      actorUser: currentUser,
      requestId: inputs.requestId,
      request: this.req,
    });

    return {
      item: board,
      included: {
        boardMemberships: [boardMembership],
      },
    };
  },
};
