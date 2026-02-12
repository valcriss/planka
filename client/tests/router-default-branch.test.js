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

jest.mock('../src/utils/match-paths', () => jest.fn(() => ({
  pattern: {
    path: '/not-handled-by-switch',
  },
  params: {},
})));

import { selectPath } from '../src/selectors/router';

describe('router selector default branch', () => {
  test('returns empty object when path matcher returns an unknown pattern', () => {
    const state = {
      router: {
        location: {
          pathname: '/anything',
        },
      },
      currentUserId: 'u1',
      models: {
        User: {
          withId: jest.fn(() => ({ id: 'u1' })),
        },
        Project: {
          all: jest.fn(() => ({ toModelArray: () => [] })),
        },
        Board: {
          withId: jest.fn(() => null),
        },
        Card: {
          all: jest.fn(() => ({ toModelArray: () => [] })),
        },
      },
    };

    expect(selectPath(state)).toEqual({});
  });
});
