import {
  selectCardLinkDeletePendingMap,
  selectCardLinkSearchByCardId,
  selectIsCardLinkCreateInProgressForCardId,
} from '../src/selectors/card-links';

describe('card-links selectors', () => {
  const state = {
    cardLinks: {
      search: {
        cardA: {
          query: 'bug',
          cardIds: ['c1'],
          isFetching: true,
          error: null,
        },
      },
      pending: {
        create: {
          cardA: true,
          cardB: 0,
        },
        delete: {
          link1: true,
        },
      },
    },
  };

  test('returns card-specific search state or default empty state', () => {
    expect(selectCardLinkSearchByCardId(state, 'cardA')).toEqual({
      query: 'bug',
      cardIds: ['c1'],
      isFetching: true,
      error: null,
    });
    expect(selectCardLinkSearchByCardId(state, 'unknown')).toEqual({
      query: '',
      cardIds: [],
      isFetching: false,
      error: null,
    });
  });

  test('returns create pending flag as boolean', () => {
    expect(selectIsCardLinkCreateInProgressForCardId(state, 'cardA')).toBe(true);
    expect(selectIsCardLinkCreateInProgressForCardId(state, 'cardB')).toBe(false);
    expect(selectIsCardLinkCreateInProgressForCardId(state, 'unknown')).toBe(false);
  });

  test('returns delete pending map', () => {
    expect(selectCardLinkDeletePendingMap(state)).toEqual({
      link1: true,
    });
  });
});
