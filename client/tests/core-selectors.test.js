import {
  selectHomeView,
  selectIsContentFetching,
  selectIsEditModeEnabled,
  selectIsFavoritesEnabled,
  selectIsHiddenProjectsVisible,
  selectIsLogouting,
  selectProjectsOrder,
  selectProjectsSearch,
  selectRecentCardId,
} from '../src/selectors/core';

describe('core selectors', () => {
  test('reads all fields from core state', () => {
    const state = {
      core: {
        isContentFetching: true,
        isLogouting: false,
        isFavoritesEnabled: true,
        isEditModeEnabled: false,
        recentCardId: 'card-1',
        homeView: 'boards',
        projectsSearch: 'roadmap',
        projectsOrder: 'name_asc',
        isHiddenProjectsVisible: true,
      },
    };

    expect(selectIsContentFetching(state)).toBe(true);
    expect(selectIsLogouting(state)).toBe(false);
    expect(selectIsFavoritesEnabled(state)).toBe(true);
    expect(selectIsEditModeEnabled(state)).toBe(false);
    expect(selectRecentCardId(state)).toBe('card-1');
    expect(selectHomeView(state)).toBe('boards');
    expect(selectProjectsSearch(state)).toBe('roadmap');
    expect(selectProjectsOrder(state)).toBe('name_asc');
    expect(selectIsHiddenProjectsVisible(state)).toBe(true);
  });
});
