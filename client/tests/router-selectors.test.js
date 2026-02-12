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

jest.mock('../src/selectors/users', () => ({
  selectCurrentUserId: (state) => state.currentUserId,
}));

import Paths from '../src/constants/Paths';
import { selectPathname, selectPathsMatch, selectPath } from '../src/selectors/router';

const createState = ({ pathname, models, currentUserId = 'u1' }) => ({
  router: {
    location: {
      pathname,
    },
  },
  models,
  currentUserId,
});

describe('router selectors', () => {
  test('selectPathname and selectPathsMatch work for known and unknown routes', () => {
    const stateKnown = createState({ pathname: '/projects/PRJ', models: {} });
    const stateUnknown = createState({ pathname: '/unknown', models: {} });

    expect(selectPathname(stateKnown)).toBe('/projects/PRJ');
    expect(selectPathsMatch(stateKnown).pattern.path).toBe(Paths.PROJECTS);
    expect(selectPathsMatch(stateUnknown)).toBeNull();
  });

  test('selectPath returns empty object when no route matches', () => {
    const state = createState({
      pathname: '/unknown',
      models: {
        User: { withId: jest.fn(() => ({})) },
        Project: { all: jest.fn(() => ({ toModelArray: () => [] })) },
        Board: { withId: jest.fn() },
        Card: { all: jest.fn(() => ({ toModelArray: () => [] })) },
      },
    });

    expect(selectPath(state)).toEqual({});
  });

  test('PROJECTS and PROJECT_EPICS return project id only when available for user', () => {
    const availableProject = {
      id: 'p1',
      code: 'PRJ',
      isAvailableForUser: () => true,
    };

    const baseModels = {
      User: { withId: jest.fn(() => ({ id: 'u1' })) },
      Project: {
        all: jest.fn(() => ({
          toModelArray: () => [availableProject],
        })),
      },
      Board: { withId: jest.fn() },
      Card: { all: jest.fn(() => ({ toModelArray: () => [] })) },
    };

    const stateProject = createState({ pathname: '/projects/PRJ', models: baseModels });
    const stateEpics = createState({ pathname: '/boards/PRJ/project-epics', models: baseModels });

    expect(selectPath(stateProject)).toEqual({ projectId: 'p1' });
    expect(selectPath(stateEpics)).toEqual({ projectId: 'p1' });

    const unavailableModels = {
      ...baseModels,
      Project: {
        all: jest.fn(() => ({
          toModelArray: () => [
            {
              ...availableProject,
              isAvailableForUser: () => false,
            },
          ],
        })),
      },
    };

    expect(selectPath(createState({ pathname: '/projects/PRJ', models: unavailableModels }))).toEqual({
      projectId: null,
    });
    expect(
      selectPath(createState({ pathname: '/boards/PRJ/project-epics', models: unavailableModels })),
    ).toEqual({
      projectId: null,
    });
  });

  test('BOARDS resolves board and project ids only for available project/board', () => {
    const board = { id: 'b1', slug: 'board-a', projectId: 'p1' };
    const project = {
      id: 'p1',
      code: 'PRJ',
      isAvailableForUser: () => true,
      getBoardsModelArrayAvailableForUser: () => [board],
    };

    const models = {
      User: { withId: jest.fn(() => ({ id: 'u1' })) },
      Project: {
        all: jest.fn(() => ({
          toModelArray: () => [project],
        })),
      },
      Board: { withId: jest.fn((id) => (id === 'b1' ? board : null)) },
      Card: { all: jest.fn(() => ({ toModelArray: () => [] })) },
    };

    expect(selectPath(createState({ pathname: '/boards/PRJ/board-a', models }))).toEqual({
      boardId: 'b1',
      projectId: 'p1',
    });

    const projectWithoutBoard = {
      ...project,
      getBoardsModelArrayAvailableForUser: () => [],
    };

    const modelsWithoutBoard = {
      ...models,
      Project: {
        all: jest.fn(() => ({
          toModelArray: () => [projectWithoutBoard],
        })),
      },
    };

    expect(selectPath(createState({ pathname: '/boards/PRJ/missing', models: modelsWithoutBoard }))).toEqual({
      boardId: null,
      projectId: null,
    });

    const unavailableProjectModels = {
      ...models,
      Project: {
        all: jest.fn(() => ({
          toModelArray: () => [
            {
              ...project,
              isAvailableForUser: () => false,
            },
          ],
        })),
      },
    };

    expect(
      selectPath(createState({ pathname: '/boards/PRJ/board-a', models: unavailableProjectModels })),
    ).toEqual({
      boardId: null,
      projectId: null,
    });
  });

  test('CARDS resolves card, board and project ids only when available', () => {
    const board = { id: 'b2', projectId: 'p2' };
    const project = {
      id: 'p2',
      code: 'PR2',
    };
    const card = {
      id: 'c2',
      boardId: 'b2',
      number: 42,
      isAvailableForUser: () => true,
    };

    const models = {
      User: { withId: jest.fn(() => ({ id: 'u1' })) },
      Project: {
        all: jest.fn(() => ({
          toModelArray: () => [project],
        })),
      },
      Board: { withId: jest.fn((id) => (id === 'b2' ? board : null)) },
      Card: {
        all: jest.fn(() => ({
          toModelArray: () => [{ ...card, id: 'cX', number: 999 }, card],
        })),
      },
    };

    expect(selectPath(createState({ pathname: '/cards/PR2/42', models }))).toEqual({
      cardId: 'c2',
      boardId: 'b2',
      projectId: 'p2',
    });

    const unavailableCardModels = {
      ...models,
      Card: {
        all: jest.fn(() => ({
          toModelArray: () => [
            {
              ...card,
              isAvailableForUser: () => false,
            },
          ],
        })),
      },
    };

    expect(selectPath(createState({ pathname: '/cards/PR2/42', models: unavailableCardModels }))).toEqual({
      cardId: null,
      boardId: null,
      projectId: null,
    });

    const missingBoardModels = {
      ...models,
      Board: {
        withId: jest.fn().mockImplementationOnce(() => board).mockImplementation(() => null),
      },
    };

    expect(selectPath(createState({ pathname: '/cards/PR2/42', models: missingBoardModels }))).toEqual({
      cardId: 'c2',
      boardId: null,
      projectId: null,
    });
  });
});
