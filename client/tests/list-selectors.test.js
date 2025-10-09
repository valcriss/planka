jest.mock('../src/constants/Config', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../src/assets/images/deleted-user.png', () => 'deleted-user.png', {
  virtual: true,
});

import orm from '../src/orm';
import {
  makeSelectCardCountByListId,
  makeSelectFilteredCardIdsByListId,
  makeSelectIsCardLimitReachedByListId,
  makeSelectIsCardLimitBlockingByListId,
  makeSelectSwimlaneLanesByListId,
  makeSelectUniqueFilteredCardIdsByListId,
} from '../src/selectors/lists';
import { makeSelectProjectById } from '../src/selectors/projects';
import { BoardSwimlaneTypes, BoardViews, ListTypes } from '../src/constants/Enums';

const PROJECT_ID = 'project-1';
const BOARD_ID = 'board-1';
const LIST_ID = 'list-1';

const createState = ({
  useScrum = false,
  cardLimit = 0,
  searchTerm = '',
  cards = [],
  users = [],
  labels = [],
  epics = [],
  boardFilters = {},
} = {}) => {
  const session = orm.session(orm.getEmptyState());
  const { Project, Board, List, Card, User, Label, Epic } = session;

  Project.create({
    id: PROJECT_ID,
    name: 'Project',
    code: 'project-code',
    useScrum,
  });

  users.forEach((user) => {
    User.create(user);
  });

  labels.forEach((label) => {
    Label.create({
      boardId: BOARD_ID,
      ...label,
    });
  });

  epics.forEach((epic) => {
    Epic.create({
      projectId: PROJECT_ID,
      ...epic,
    });
  });

  const boardModel = Board.create({
    id: BOARD_ID,
    name: 'Board',
    slug: 'board',
    position: 1,
    projectId: PROJECT_ID,
    defaultView: BoardViews.KANBAN,
    view: BoardViews.KANBAN,
    showCardCount: true,
    search: searchTerm,
  });

  if (boardFilters.userIds) {
    boardFilters.userIds.forEach((userId) => {
      boardModel.filterUsers.add(userId);
    });
  }

  if (boardFilters.labelIds) {
    boardFilters.labelIds.forEach((labelId) => {
      boardModel.filterLabels.add(labelId);
    });
  }

  List.create({
    id: LIST_ID,
    name: 'List',
    slug: 'list',
    boardId: BOARD_ID,
    type: ListTypes.ACTIVE,
    position: 1,
    cardLimit,
  });

  cards.forEach((rawCard, index) => {
    const cardData =
      typeof rawCard === 'string'
        ? { id: `card-${index + 1}`, name: rawCard }
        : rawCard;

    const {
      id = `card-${index + 1}`,
      name,
      position = index + 1,
      memberIds = [],
      labelIds = [],
      epicId = null,
    } = cardData;

    const cardModel = Card.create({
      id,
      name,
      position,
      boardId: BOARD_ID,
      listId: LIST_ID,
      epicId,
    });

    memberIds.forEach((memberId) => {
      cardModel.users.add(memberId);
    });

    labelIds.forEach((labelId) => {
      cardModel.labels.add(labelId);
    });
  });

  return { orm: session.state };
};

describe('list selectors', () => {
  test('provides filtered ids and total count to drive the list counter', () => {
    const state = createState({
      cards: ['Alpha story', 'Bravo mission', 'Another alpha item'],
      searchTerm: 'alpha',
    });

    const selectCardCount = makeSelectCardCountByListId();
    const selectFilteredIds = makeSelectFilteredCardIdsByListId();

    expect(selectCardCount(state, LIST_ID)).toBe(3);
    expect(selectFilteredIds(state, LIST_ID)).toEqual(['card-1', 'card-3']);
  });

  test('detects when the card limit is reached without blocking additions', () => {
    const state = createState({
      cardLimit: 2,
      cards: ['Card 1', 'Card 2', 'Card 3'],
    });

    const selectIsLimitReached = makeSelectIsCardLimitReachedByListId();
    const selectIsLimitBlocking = makeSelectIsCardLimitBlockingByListId();

    expect(selectIsLimitReached(state, LIST_ID)).toBe(true);
    expect(selectIsLimitBlocking(state, LIST_ID)).toBe(false);
  });

  test('detects when the card limit should block new additions', () => {
    const state = createState({
      cardLimit: 2,
      cards: ['Card 1', 'Card 2', 'Card 3', 'Card 4'],
    });

    const selectIsLimitReached = makeSelectIsCardLimitReachedByListId();
    const selectIsLimitBlocking = makeSelectIsCardLimitBlockingByListId();

    expect(selectIsLimitReached(state, LIST_ID)).toBe(true);
    expect(selectIsLimitBlocking(state, LIST_ID)).toBe(true);
  });

  test('groups filtered cards into member swimlanes with duplication and unassigned lane', () => {
    const state = createState({
      users: [
        { id: 'user-1', name: 'Alice' },
        { id: 'user-2', name: 'Bob' },
      ],
      cards: [
        {
          id: 'card-1',
          name: 'Multi member card',
          memberIds: ['user-1', 'user-2'],
        },
        {
          id: 'card-2',
          name: 'Orphan card',
        },
      ],
    });

    const selectSwimlanes = makeSelectSwimlaneLanesByListId();
    const selectUniqueIds = makeSelectUniqueFilteredCardIdsByListId();

    expect(selectSwimlanes(state, LIST_ID, BoardSwimlaneTypes.MEMBERS)).toEqual([
      { id: 'member:user-1', cardIds: ['card-1'] },
      { id: 'member:user-2', cardIds: ['card-1'] },
      { id: 'unassigned', cardIds: ['card-2'] },
    ]);
    expect(selectUniqueIds(state, LIST_ID)).toEqual(['card-1', 'card-2']);
  });

  test('groups filtered cards into label swimlanes and keeps unassigned lane when needed', () => {
    const state = createState({
      labels: [
        { id: 'label-1', name: 'Frontend', position: 1 },
        { id: 'label-2', name: 'Backend', position: 2 },
      ],
      cards: [
        {
          id: 'card-1',
          name: 'Tagged card',
          labelIds: ['label-1', 'label-2'],
        },
        {
          id: 'card-2',
          name: 'No label card',
        },
      ],
    });

    const selectSwimlanes = makeSelectSwimlaneLanesByListId();

    expect(selectSwimlanes(state, LIST_ID, BoardSwimlaneTypes.LABELS)).toEqual([
      { id: 'label:label-1', cardIds: ['card-1'] },
      { id: 'label:label-2', cardIds: ['card-1'] },
      { id: 'unassigned', cardIds: ['card-2'] },
    ]);
  });

  test('respects board filters when building epic swimlanes', () => {
    const state = createState({
      labels: [
        { id: 'label-1', name: 'Frontend', position: 1 },
      ],
      epics: [
        { id: 'epic-1', name: 'Release A' },
        { id: 'epic-2', name: 'Release B' },
      ],
      cards: [
        {
          id: 'card-1',
          name: 'Included card',
          epicId: 'epic-1',
          labelIds: ['label-1'],
        },
        {
          id: 'card-2',
          name: 'Filtered out card',
          epicId: 'epic-2',
        },
      ],
      boardFilters: {
        labelIds: ['label-1'],
      },
    });

    const selectSwimlanes = makeSelectSwimlaneLanesByListId();
    const selectUniqueIds = makeSelectUniqueFilteredCardIdsByListId();

    expect(selectSwimlanes(state, LIST_ID, BoardSwimlaneTypes.EPICS)).toEqual([
      { id: 'epic:epic-1', cardIds: ['card-1'] },
    ]);
    expect(selectUniqueIds(state, LIST_ID)).toEqual(['card-1']);
  });
});

describe('project selector', () => {
  test('reflects Scrum toggle state for the project', () => {
    const selectProject = makeSelectProjectById();

    const disabledState = createState({ useScrum: false });
    expect(selectProject(disabledState, PROJECT_ID).useScrum).toBe(false);

    const enabledState = createState({ useScrum: true });
    expect(selectProject(enabledState, PROJECT_ID).useScrum).toBe(true);
  });
});
