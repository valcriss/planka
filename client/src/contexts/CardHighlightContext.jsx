/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { createContext, useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

export const CardHighlightContext = createContext({
  focusedCardId: null,
  relatedCardIds: new Set(),
  setHighlight: () => {},
  clearHighlight: () => {},
});

function CardHighlightProvider({ children }) {
  const [focusedCardId, setFocusedCardId] = useState(null);
  const [relatedCardIds, setRelatedCardIds] = useState(() => new Set());

  const setHighlight = useCallback((cardId, relatedIds) => {
    setFocusedCardId(cardId);
    setRelatedCardIds(new Set(relatedIds));
  }, []);

  const clearHighlight = useCallback(() => {
    setFocusedCardId(null);
    setRelatedCardIds(new Set());
  }, []);

  const value = useMemo(
    () => ({ focusedCardId, relatedCardIds, setHighlight, clearHighlight }),
    [focusedCardId, relatedCardIds, setHighlight, clearHighlight],
  );

  return <CardHighlightContext.Provider value={value}>{children}</CardHighlightContext.Provider>;
}

CardHighlightProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { CardHighlightProvider };
