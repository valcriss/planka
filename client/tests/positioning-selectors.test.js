jest.mock('redux-orm', () => ({
  createSelector: (...args) => {
    const projector = args[args.length - 1];
    const inputSelectors = args.slice(1, -1);

    return (state, ...params) => {
      const values = inputSelectors.map((selector) => selector(state, ...params));
      return projector(state.models, ...values);
    };
  },
}));

jest.mock('../src/orm', () => ({}));
jest.mock('../src/constants/Config', () => ({
  __esModule: true,
  default: {
    POSITION_GAP: 1000,
  },
}));

import {
  selectNextBoardPosition,
  selectNextLabelPosition,
  selectNextEpicPosition,
  selectNextListPosition,
  selectNextCardPosition,
  selectNextTaskListPosition,
  selectNextTaskPosition,
  selectNextCustomFieldGroupPositionInBoard,
  selectNextCustomFieldGroupPositionInCard,
  selectNextCustomFieldPositionInBaseGroup,
  selectNextCustomFieldPositionInGroup,
} from '../src/selectors/positioning';

const makeItems = () => [
  { id: 'a', position: 1000 },
  { id: 'b', position: 2000 },
  { id: 'c', position: 3000 },
];

const createState = () => ({
  models: {
    Project: {
      withId: jest.fn((id) =>
        id === 'p1'
          ? {
              getBoardsQuerySet: () => ({ toRefArray: () => makeItems() }),
            }
          : null,
      ),
    },
    Board: {
      withId: jest.fn((id) =>
        id === 'b1'
          ? {
              getLabelsQuerySet: () => ({ toRefArray: () => makeItems() }),
              getFiniteListsQuerySet: () => ({ toRefArray: () => makeItems() }),
              getCustomFieldGroupsQuerySet: () => ({ toRefArray: () => makeItems() }),
            }
          : null,
      ),
    },
    Epic: {
      filter: jest.fn(({ projectId }) => ({
        orderBy: () => ({
          toRefArray: () => (projectId === 'p1' ? makeItems() : []),
        }),
      })),
    },
    List: {
      withId: jest.fn((id) =>
        id === 'l1'
          ? {
              getFilteredCardsModelArray: () => makeItems(),
            }
          : null,
      ),
    },
    Card: {
      withId: jest.fn((id) =>
        id === 'c1'
          ? {
              getTaskListsQuerySet: () => ({ toRefArray: () => makeItems() }),
              getCustomFieldGroupsQuerySet: () => ({ toRefArray: () => makeItems() }),
            }
          : null,
      ),
    },
    TaskList: {
      withId: jest.fn((id) =>
        id === 'tl1'
          ? {
              getTasksQuerySet: () => ({ toRefArray: () => makeItems() }),
            }
          : null,
      ),
    },
    BaseCustomFieldGroup: {
      withId: jest.fn((id) =>
        id === 'bg1'
          ? {
              getCustomFieldsQuerySet: () => ({ toRefArray: () => makeItems() }),
            }
          : null,
      ),
    },
    CustomFieldGroup: {
      withId: jest.fn((id) =>
        id === 'cg1'
          ? {
              getCustomFieldsQuerySet: () => ({ toRefArray: () => makeItems() }),
            }
          : null,
      ),
    },
  },
});

describe('positioning selectors', () => {
  test('return null when model is missing for model-bound selectors', () => {
    const state = createState();

    expect(selectNextBoardPosition(state, 'missing')).toBeNull();
    expect(selectNextLabelPosition(state, 'missing')).toBeNull();
    expect(selectNextListPosition(state, 'missing')).toBeNull();
    expect(selectNextCardPosition(state, 'missing')).toBeNull();
    expect(selectNextTaskListPosition(state, 'missing')).toBeNull();
    expect(selectNextTaskPosition(state, 'missing')).toBeNull();
    expect(selectNextCustomFieldGroupPositionInBoard(state, 'missing')).toBeNull();
    expect(selectNextCustomFieldGroupPositionInCard(state, 'missing')).toBeNull();
    expect(selectNextCustomFieldPositionInBaseGroup(state, 'missing')).toBeNull();
    expect(selectNextCustomFieldPositionInGroup(state, 'missing')).toBeNull();
  });

  test('append position uses POSITION_GAP from last item', () => {
    const state = createState();

    expect(selectNextBoardPosition(state, 'p1')).toBe(4000);
    expect(selectNextLabelPosition(state, 'b1')).toBe(4000);
    expect(selectNextEpicPosition(state, 'p1')).toBe(4000);
  });

  test('insertion at index computes midpoint and supports excluded item', () => {
    const state = createState();

    expect(selectNextListPosition(state, 'b1', 1)).toBe(1500);
    expect(selectNextCardPosition(state, 'l1', 2, 'b')).toBe(4000);
    expect(selectNextTaskListPosition(state, 'c1', 1, 'a')).toBe(2500);
    expect(selectNextTaskPosition(state, 'tl1', 0)).toBe(500);
    expect(selectNextCustomFieldGroupPositionInBoard(state, 'b1', 2, 'b')).toBe(4000);
    expect(selectNextCustomFieldGroupPositionInCard(state, 'c1', 0)).toBe(500);
    expect(selectNextCustomFieldPositionInBaseGroup(state, 'bg1', 1)).toBe(1500);
    expect(selectNextCustomFieldPositionInGroup(state, 'cg1', 1, 'a')).toBe(2500);
  });

  test('epic selector handles empty project list', () => {
    const state = createState();
    expect(selectNextEpicPosition(state, 'missing')).toBe(1000);
  });
});
