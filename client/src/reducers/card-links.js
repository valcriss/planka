/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const initialState = {
  search: {},
  pending: {
    create: {},
    delete: {},
  },
};

const removeKey = (object, key) => {
  if (!object[key]) {
    return object;
  }

  const { [key]: _removed, ...rest } = object;
  return rest;
};

// eslint-disable-next-line default-param-last
export default (state = initialState, { type, payload }) => {
  switch (type) {
    case ActionTypes.CARD_LINKS_SEARCH: {
      const { cardId, search } = payload;

      return {
        ...state,
        search: {
          ...state.search,
          [cardId]: {
            query: search,
            cardIds: [],
            isFetching: true,
            error: null,
          },
        },
      };
    }
    case ActionTypes.CARD_LINKS_SEARCH__SUCCESS: {
      const { cardId, search, cards } = payload;

      return {
        ...state,
        search: {
          ...state.search,
          [cardId]: {
            query: search,
            cardIds: cards.map((card) => card.id),
            isFetching: false,
            error: null,
          },
        },
      };
    }
    case ActionTypes.CARD_LINKS_SEARCH__FAILURE: {
      const { cardId, search, error } = payload;

      return {
        ...state,
        search: {
          ...state.search,
          [cardId]: {
            query: search,
            cardIds: [],
            isFetching: false,
            error,
          },
        },
      };
    }
    case ActionTypes.CARD_LINK_CREATE: {
      const { cardId } = payload;

      return {
        ...state,
        pending: {
          ...state.pending,
          create: {
            ...state.pending.create,
            [cardId]: true,
          },
        },
      };
    }
    case ActionTypes.CARD_LINK_CREATE__SUCCESS:
    case ActionTypes.CARD_LINK_CREATE_HANDLE: {
      const { cardLink } = payload;

      return {
        ...state,
        pending: {
          ...state.pending,
          create: removeKey(state.pending.create, cardLink.cardId),
        },
      };
    }
    case ActionTypes.CARD_LINK_CREATE__FAILURE: {
      const { cardId } = payload;

      return {
        ...state,
        pending: {
          ...state.pending,
          create: removeKey(state.pending.create, cardId),
        },
      };
    }
    case ActionTypes.CARD_LINK_DELETE: {
      const { id } = payload;

      return {
        ...state,
        pending: {
          ...state.pending,
          delete: {
            ...state.pending.delete,
            [id]: true,
          },
        },
      };
    }
    case ActionTypes.CARD_LINK_DELETE__SUCCESS:
    case ActionTypes.CARD_LINK_DELETE_HANDLE: {
      const {
        cardLink: { id },
      } = payload;

      return {
        ...state,
        pending: {
          ...state.pending,
          delete: removeKey(state.pending.delete, id),
        },
      };
    }
    case ActionTypes.CARD_LINK_DELETE__FAILURE: {
      const { id } = payload;

      return {
        ...state,
        pending: {
          ...state.pending,
          delete: removeKey(state.pending.delete, id),
        },
      };
    }
    default:
      return state;
  }
};
