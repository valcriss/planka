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
} from '../src/selectors/lists';
import { makeSelectProjectById } from '../src/selectors/projects';
import { BoardViews, ListTypes } from '../src/constants/Enums';

const PROJECT_ID = 'project-1';
const BOARD_ID = 'board-1';
const LIST_ID = 'list-1';

const createState = ({
  useScrum = false,
  cardLimit = 0,
  searchTerm = '',
  cards = [],
} = {}) => {
  const session = orm.session(orm.getEmptyState());
  const { Project, Board, List, Card } = session;

  Project.create({
    id: PROJECT_ID,
    name: 'Project',
    code: 'project-code',
    useScrum,
  });

  Board.create({
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

  List.create({
    id: LIST_ID,
    name: 'List',
    slug: 'list',
    boardId: BOARD_ID,
    type: ListTypes.ACTIVE,
    position: 1,
    cardLimit,
  });

  cards.forEach((name, index) => {
    Card.create({
      id: `card-${index + 1}`,
      name,
      position: index + 1,
      boardId: BOARD_ID,
      listId: LIST_ID,
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
