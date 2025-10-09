jest.mock('../src/constants/Config', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../src/assets/images/deleted-user.png', () => 'deleted-user.png', {
  virtual: true,
});

jest.mock('../src/lib/redux-router', () => ({
  __esModule: true,
  LOCATION_CHANGE_HANDLE: 'LOCATION_CHANGE_HANDLE',
}));

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../src/i18n', () => ({
  __esModule: true,
  default: {},
}));

import { all, put, select } from 'redux-saga/effects';

import entryActions from '../src/entry-actions';
import selectors from '../src/selectors';
import { BoardSwimlaneTypes } from '../src/constants/Enums';
import { applyLaneContextAfterCreate } from '../src/sagas/core/services/cards';

describe('cards sagas - applyLaneContextAfterCreate', () => {
  const cardId = 'card-1';

  test('returns immediately when no lane context is provided', () => {
    const iterator = applyLaneContextAfterCreate({ id: cardId }, undefined, BoardSwimlaneTypes.MEMBERS);

    const firstStep = iterator.next();
    expect(firstStep.done).toBe(true);
    expect(firstStep.value).toBeUndefined();
  });

  test('clears all member assignments when moving to the unassigned lane', () => {
    const iterator = applyLaneContextAfterCreate({ id: cardId }, null, BoardSwimlaneTypes.MEMBERS);

    expect(iterator.next().value).toEqual(select(selectors.selectUserIdsByCardId, cardId));

    const removalEffect = iterator.next(['user-1', 'user-2']).value;
    expect(removalEffect).toEqual(
      all([
        put(entryActions.removeUserFromCard('user-1', cardId)),
        put(entryActions.removeUserFromCard('user-2', cardId)),
      ]),
    );

    expect(iterator.next().done).toBe(true);
  });

  test('stops early when there is nothing to clear from a lane', () => {
    const iterator = applyLaneContextAfterCreate({ id: cardId }, null, BoardSwimlaneTypes.MEMBERS);

    expect(iterator.next().value).toEqual(select(selectors.selectUserIdsByCardId, cardId));

    const completionStep = iterator.next([]);
    expect(completionStep.done).toBe(true);
    expect(completionStep.value).toBeUndefined();
  });

  test('treats the explicit unassigned lane context like a null value', () => {
    const iterator = applyLaneContextAfterCreate(
      { id: cardId },
      { type: 'unassigned' },
      BoardSwimlaneTypes.LABELS,
    );

    expect(iterator.next().value).toEqual(select(selectors.selectLabelIdsByCardId, cardId));

    const removalEffect = iterator.next(['label-1']).value;
    expect(removalEffect).toEqual(
      all([put(entryActions.removeLabelFromCard('label-1', cardId))]),
    );

    expect(iterator.next().done).toBe(true);
  });

  test('removes the epic assignment when dropping into the unassigned epic lane', () => {
    const iterator = applyLaneContextAfterCreate(
      { id: cardId, epicId: 'epic-42' },
      null,
      BoardSwimlaneTypes.EPICS,
    );

    expect(iterator.next().value).toEqual(
      put(entryActions.updateCard(cardId, { epicId: null })),
    );
    expect(iterator.next().done).toBe(true);
  });

  test('adds the card to the targeted member lane', () => {
    const iterator = applyLaneContextAfterCreate(
      { id: cardId },
      { type: 'member', value: 'user-99' },
      BoardSwimlaneTypes.MEMBERS,
    );

    expect(iterator.next().value).toEqual(
      put(entryActions.addUserToCard('user-99', cardId)),
    );
    expect(iterator.next().done).toBe(true);
  });

  test('adds the card to the targeted label lane', () => {
    const iterator = applyLaneContextAfterCreate(
      { id: cardId },
      { type: 'label', value: 'label-77' },
      BoardSwimlaneTypes.LABELS,
    );

    expect(iterator.next().value).toEqual(
      put(entryActions.addLabelToCard('label-77', cardId)),
    );
    expect(iterator.next().done).toBe(true);
  });

  test('updates the epic assignment when moving into a new epic lane', () => {
    const iterator = applyLaneContextAfterCreate(
      { id: cardId, epicId: null },
      { type: 'epic', value: 'epic-007' },
      BoardSwimlaneTypes.EPICS,
    );

    expect(iterator.next().value).toEqual(
      put(entryActions.updateCard(cardId, { epicId: 'epic-007' })),
    );
    expect(iterator.next().done).toBe(true);
  });

  test('skips redundant epic updates when the target already matches', () => {
    const iterator = applyLaneContextAfterCreate(
      { id: cardId, epicId: 'epic-007' },
      { type: 'epic', value: 'epic-007' },
      BoardSwimlaneTypes.EPICS,
    );

    const firstStep = iterator.next();
    expect(firstStep.done).toBe(true);
    expect(firstStep.value).toBeUndefined();
  });

  test('ignores malformed lane context values', () => {
    const iterator = applyLaneContextAfterCreate(
      { id: cardId },
      'unexpected-value',
      BoardSwimlaneTypes.MEMBERS,
    );

    const firstStep = iterator.next();
    expect(firstStep.done).toBe(true);
    expect(firstStep.value).toBeUndefined();
  });
});
