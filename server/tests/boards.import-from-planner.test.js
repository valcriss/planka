const { POSITION_GAP } = require('../constants');

const helper = require('../api/helpers/boards/import-from-planner');

const originalGlobals = {
  List: global.List,
  Label: global.Label,
  Card: global.Card,
  BoardMembership: global.BoardMembership,
  CardMembership: global.CardMembership,
  CardLabel: global.CardLabel,
  TaskList: global.TaskList,
  Task: global.Task,
  User: global.User,
  sails: global.sails,
};

describe('boards/import-from-planner helper', () => {
  beforeEach(() => {
    global.List = {
      Types: {
        ACTIVE: 'active',
        CLOSED: 'closed',
        ARCHIVE: 'archive',
        TRASH: 'trash',
      },
      qm: {
        createOne: jest.fn(),
      },
    };

    global.Label = {
      COLORS: ['berry-red', 'pumpkin-orange', 'lagoon-blue', 'pink-tulip'],
      qm: {
        createOne: jest.fn(),
      },
    };

    global.Card = {
      Types: {
        PROJECT: 'project',
        STORY: 'story',
      },
      qm: {
        createOne: jest.fn(),
      },
    };

    global.BoardMembership = {
      Roles: {
        EDITOR: 'editor',
      },
      qm: {
        getByBoardId: jest.fn(),
        createOne: jest.fn(),
      },
    };

    global.CardMembership = {
      qm: {
        createOne: jest.fn(),
      },
    };

    global.CardLabel = {
      qm: {
        createOne: jest.fn(),
      },
    };

    global.TaskList = {
      qm: {
        createOne: jest.fn(),
      },
    };

    global.Task = {
      qm: {
        createOne: jest.fn(),
      },
    };

    global.User = {
      qm: {
        getAll: jest.fn(),
      },
    };

    global.sails = {
      helpers: {
        utils: {
          makeTranslator: jest.fn().mockImplementation(() => (key) => key),
        },
      },
      sendNativeQuery: jest.fn().mockResolvedValue({ rows: [{ next: 1 }] }),
      log: {
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    if (typeof originalGlobals.List === 'undefined') {
      delete global.List;
    } else {
      global.List = originalGlobals.List;
    }

    if (typeof originalGlobals.Label === 'undefined') {
      delete global.Label;
    } else {
      global.Label = originalGlobals.Label;
    }

    if (typeof originalGlobals.Card === 'undefined') {
      delete global.Card;
    } else {
      global.Card = originalGlobals.Card;
    }

    if (typeof originalGlobals.BoardMembership === 'undefined') {
      delete global.BoardMembership;
    } else {
      global.BoardMembership = originalGlobals.BoardMembership;
    }

    if (typeof originalGlobals.CardMembership === 'undefined') {
      delete global.CardMembership;
    } else {
      global.CardMembership = originalGlobals.CardMembership;
    }

    if (typeof originalGlobals.CardLabel === 'undefined') {
      delete global.CardLabel;
    } else {
      global.CardLabel = originalGlobals.CardLabel;
    }

    if (typeof originalGlobals.TaskList === 'undefined') {
      delete global.TaskList;
    } else {
      global.TaskList = originalGlobals.TaskList;
    }

    if (typeof originalGlobals.Task === 'undefined') {
      delete global.Task;
    } else {
      global.Task = originalGlobals.Task;
    }

    if (typeof originalGlobals.User === 'undefined') {
      delete global.User;
    } else {
      global.User = originalGlobals.User;
    }

    if (typeof originalGlobals.sails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalGlobals.sails;
    }
  });

  test('creates lists, labels, cards, memberships and tasks from planner rows', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-06-15T09:00:00.000Z'));

    const createdLists = [];
    global.List.qm.createOne.mockImplementation(async (values) => {
      const record = { id: `list-${createdLists.length + 1}`, ...values };
      createdLists.push(record);
      return record;
    });

    const createdLabels = [];
    global.Label.qm.createOne.mockImplementation(async (values) => {
      const record = { id: `label-${createdLabels.length + 1}`, ...values };
      createdLabels.push(record);
      return record;
    });

    const createdCards = [];
    global.Card.qm.createOne.mockImplementation(async (values) => {
      const record = { id: `card-${createdCards.length + 1}`, ...values };
      createdCards.push(record);
      return record;
    });

    const createdBoardMemberships = [];
    global.BoardMembership.qm.getByBoardId.mockResolvedValue([{ userId: 'user-actor' }]);
    global.BoardMembership.qm.createOne.mockImplementation(async (values) => {
      createdBoardMemberships.push(values);
      return values;
    });

    const createdCardMemberships = [];
    global.CardMembership.qm.createOne.mockImplementation(async (values) => {
      createdCardMemberships.push(values);
      return values;
    });

    const createdCardLabels = [];
    global.CardLabel.qm.createOne.mockImplementation(async (values) => {
      createdCardLabels.push(values);
      return values;
    });

    const createdTaskLists = [];
    global.TaskList.qm.createOne.mockImplementation(async (values) => {
      const record = { id: `task-list-${createdTaskLists.length + 1}`, ...values };
      createdTaskLists.push(record);
      return record;
    });

    const createdTasks = [];
    global.Task.qm.createOne.mockImplementation(async (values) => {
      createdTasks.push(values);
      return values;
    });

    global.User.qm.getAll.mockResolvedValue([
      { id: 'user-alice', name: 'Alice Martin' },
      { id: 'user-bob', name: 'Bob Durant' },
      { id: 'user-charlie', name: 'Charlie Durand' },
    ]);

    const board = { id: 'board-1', defaultCardType: 'project' };
    const project = { id: 'project-1' };
    const actorUser = { id: 'user-actor', language: 'fr' };
    const request = { getLocale: jest.fn().mockReturnValue('fr') };
    const lists = [
      { id: 'list-archive', type: List.Types.ARCHIVE, slug: null },
      { id: 'list-trash', type: List.Types.TRASH, slug: null },
    ];

    const planner = {
      fileName: 'planner.xlsx',
      sheetName: 'Plan',
      rows: [
        {
          taskId: 'task-1',
          title: 'Préparer dossier',
          bucketName: 'En cours',
          createdBy: 'Alice Martin',
          assignments: 'Bob Durant',
          dueDate: '2024-06-20T00:00:00.000Z',
          startDate: '2024-06-10T00:00:00.000Z',
          labels: 'Rouge;Vert',
          priority: 'Important',
          notes: 'Description initiale',
        },
        {
          taskId: 'task-2',
          title: 'Clôturer projet',
          bucketName: 'Terminé',
          createdBy: 'Alice Martin',
          assignments: 'Charlie Durand;Bob Durant',
          executedBy: 'Charlie Durand',
          dueDate: '2024-06-05T00:00:00.000Z',
          startDate: '2024-05-25T00:00:00.000Z',
          completedDate: '2024-06-03T00:00:00.000Z',
          labels: 'Vert;Bleu',
          progress: '100%',
          planName: 'Plan A',
          estPeriodique: 'Oui',
          enRetard: 'Oui',
          checklistItems: 'Étape A;Étape B;Étape C',
          elementsDeLaListeDeControleEffectues: 2,
        },
      ],
    };

    await helper.fn({ board, lists, planner, project, actorUser, request });

    expect(global.sails.helpers.utils.makeTranslator).toHaveBeenCalledWith('fr');
    expect(global.sails.sendNativeQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT COALESCE(MAX(card.number), 0) + 1 AS next'),
      [project.id],
    );

    expect(global.sails.log.warn).not.toHaveBeenCalled();

    expect(createdLists).toHaveLength(2);
    expect(createdLists[0]).toMatchObject({
      name: 'En cours',
      type: List.Types.ACTIVE,
      position: POSITION_GAP,
      slug: 'en-cours',
    });
    expect(createdLists[1]).toMatchObject({
      name: 'Terminé',
      type: List.Types.CLOSED,
      position: POSITION_GAP * 2,
      slug: 'termine',
    });

    expect(createdLabels).toHaveLength(6);
    expect(createdLabels[0]).toMatchObject({ name: 'Important', color: 'berry-red' });
    expect(createdLabels.map((label) => label.name)).toEqual(
      expect.arrayContaining(['Recurring', 'Late']),
    );

    expect(createdCards).toHaveLength(2);
    expect(createdCards[0]).toMatchObject({
      name: 'Préparer dossier',
      listId: createdLists[0].id,
      creatorUserId: 'user-alice',
      dueDate: '2024-06-20T00:00:00.000Z',
      ganttStartDate: '2024-06-10T00:00:00.000Z',
      closedAt: null,
      listChangedAt: new Date('2024-06-15T09:00:00.000Z').toISOString(),
      number: 1,
    });
    expect(createdCards[0].description).toContain('**Planner Metadata**');
    expect(createdCards[0].description).toContain('Task ID');

    expect(createdCards[1]).toMatchObject({
      name: 'Clôturer projet',
      listId: createdLists[1].id,
      ganttEndDate: '2024-06-03T00:00:00.000Z',
      closedAt: '2024-06-03T00:00:00.000Z',
      number: 2,
    });
    expect(createdCards[1].description).toContain('- Progress: 100%');
    expect(createdCards[1].description).toContain('- Plan: Plan A');
    expect(createdCards[1].description).toContain('- Completed by: Charlie Durand');

    expect(createdBoardMemberships).toHaveLength(3);
    expect(createdBoardMemberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: 'user-alice', role: 'editor' }),
        expect.objectContaining({ userId: 'user-bob', role: 'editor' }),
        expect.objectContaining({ userId: 'user-charlie', role: 'editor' }),
      ]),
    );

    expect(createdCardMemberships).toHaveLength(3);
    expect(createdCardMemberships).toEqual(
      expect.arrayContaining([
        { cardId: 'card-1', userId: 'user-bob' },
        { cardId: 'card-2', userId: 'user-bob' },
        { cardId: 'card-2', userId: 'user-charlie' },
      ]),
    );

    expect(createdCardLabels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cardId: 'card-1', labelId: createdLabels[0].id }),
        expect.objectContaining({ cardId: 'card-1', labelId: createdLabels[1].id }),
        expect.objectContaining({ cardId: 'card-1', labelId: createdLabels[2].id }),
        expect.objectContaining({ cardId: 'card-2', labelId: createdLabels[2].id }),
        expect.objectContaining({ cardId: 'card-2', labelId: createdLabels[3].id }),
        expect.objectContaining({ cardId: 'card-2', labelId: createdLabels[4].id }),
        expect.objectContaining({ cardId: 'card-2', labelId: createdLabels[5].id }),
      ]),
    );

    expect(createdTaskLists).toHaveLength(1);
    expect(createdTaskLists[0]).toMatchObject({
      cardId: 'card-2',
      name: 'Actions',
    });

    expect(createdTasks).toHaveLength(3);
    expect(createdTasks[0]).toMatchObject({ isCompleted: true });
    expect(createdTasks[1]).toMatchObject({ isCompleted: true });
    expect(createdTasks[2]).toMatchObject({ isCompleted: false });
  });
});
