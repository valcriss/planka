/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Icon } from 'semantic-ui-react';
import { push } from '../../../lib/redux-router';
import { usePopup } from '../../../lib/popup';

import selectors from '../../../selectors';
import Paths from '../../../constants/Paths';
import { BoardMembershipRoles, CardTypes, ListTypes } from '../../../constants/Enums';
import ProjectContent from './ProjectContent';
import StoryContent from './StoryContent';
import InlineContent from './InlineContent';
import EditName from './EditName';
import ActionsStep from './ActionsStep';

import styles from './Card.module.scss';
import globalStyles from '../../../styles.module.scss';
import { CardHighlightContext } from '../../../contexts';

const DWELL_MS = 1000;
const MOVE_TOLERANCE_PX = 5; // tolerance before considering movement significant

const Card = React.memo(({ id, isInline = false }) => {
  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);
  const selectIsCardWithIdRecent = useMemo(() => selectors.makeSelectIsCardWithIdRecent(), []);
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);
  const selectBoardById = useMemo(() => selectors.makeSelectBoardById(), []);
  const selectProjectById = useMemo(() => selectors.makeSelectProjectById(), []);
  const selectOutgoingLinks = useMemo(() => selectors.makeSelectOutgoingCardLinksByCardId(), []);
  const selectIncomingLinks = useMemo(() => selectors.makeSelectIncomingCardLinksByCardId(), []);

  const card = useSelector((state) => selectCardById(state, id));
  const list = useSelector((state) => selectListById(state, card.listId));
  const board = useSelector((state) => selectBoardById(state, card.boardId));
  const project = useSelector((state) => selectProjectById(state, board.projectId));

  // Use non-factory selector (memoized internally by orm) to avoid missing factory export errors
  const isBlocked = useSelector((state) => selectors.selectIsCardBlockedById(state, id));

  const isHighlightedAsRecent = useSelector((state) => {
    const { turnOffRecentCardHighlighting } = selectors.selectCurrentUser(state);

    if (turnOffRecentCardHighlighting) {
      return false;
    }

    return selectIsCardWithIdRecent(state, id);
  });

  const canUseActions = useSelector((state) => {
    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
    return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
  });

  const outgoingLinks = useSelector((state) => selectOutgoingLinks(state, id));
  const incomingLinks = useSelector((state) => selectIncomingLinks(state, id));

  const relatedLinkCardIds = useMemo(() => {
    const ids = new Set();
    outgoingLinks.forEach((l) => ids.add(l.linkedCardId));
    incomingLinks.forEach((l) => ids.add(l.linkedCardId));
    return ids;
  }, [outgoingLinks, incomingLinks]);

  const { focusedCardId, relatedCardIds, setHighlight, clearHighlight } =
    useContext(CardHighlightContext);

  const dispatch = useDispatch();
  const [isEditNameOpened, setIsEditNameOpened] = useState(false);

  // Dwell timer refs
  const dwellTimerRef = useRef(null);
  const initialPointerPosRef = useRef(null);
  const hasTriggeredRef = useRef(false);

  const handleClick = useCallback(() => {
    if (document.activeElement) {
      document.activeElement.blur();
    }

    const path =
      card && project
        ? Paths.CARDS.replace(':projectCode', project.code).replace(':number', card.number)
        : `/cards/${id}`;
    dispatch(push(path));
  }, [id, dispatch, card, project]);

  const handleNameEdit = useCallback(() => {
    setIsEditNameOpened(true);
  }, []);

  const handleEditNameClose = useCallback(() => {
    setIsEditNameOpened(false);
  }, []);

  const clearDwellTimer = useCallback(() => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
  }, []);

  const startDwellTimer = useCallback(() => {
    clearDwellTimer();
    hasTriggeredRef.current = false;
    dwellTimerRef.current = setTimeout(() => {
      hasTriggeredRef.current = true;
      // Re-evaluate links at trigger time (peut-être chargées entre temps)
      if (relatedLinkCardIds.size === 0) {
        return; // rien à faire sans liens
      }
      const allIds = new Set(relatedLinkCardIds);
      allIds.add(id);
      setHighlight(id, Array.from(allIds));
    }, DWELL_MS);
  }, [clearDwellTimer, relatedLinkCardIds, id, setHighlight]);

  const handleMouseEnter = useCallback(
    (e) => {
      initialPointerPosRef.current = { x: e.clientX, y: e.clientY };
      startDwellTimer();
    },
    [startDwellTimer],
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (hasTriggeredRef.current || !initialPointerPosRef.current) {
        return;
      }
      const dx = Math.abs(e.clientX - initialPointerPosRef.current.x);
      const dy = Math.abs(e.clientY - initialPointerPosRef.current.y);
      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) {
        // Redémarrer le timer à la nouvelle position (l'utilisateur s'est repositionné)
        initialPointerPosRef.current = { x: e.clientX, y: e.clientY };
        startDwellTimer();
      }
    },
    [startDwellTimer],
  );

  const handleMouseLeave = useCallback(() => {
    clearDwellTimer();
    initialPointerPosRef.current = null;
    if (focusedCardId === id) {
      clearHighlight();
    }
  }, [clearDwellTimer, focusedCardId, id, clearHighlight]);

  // Cleanup on unmount
  React.useEffect(() => clearDwellTimer, [clearDwellTimer]);

  const ActionsPopup = usePopup(ActionsStep);

  if (isEditNameOpened) {
    return <EditName cardId={id} onClose={handleEditNameClose} />;
  }

  let Content;
  if (isInline) {
    Content = InlineContent;
  } else {
    switch (card.type) {
      case CardTypes.PROJECT:
        Content = ProjectContent;

        break;
      case CardTypes.STORY:
        Content = StoryContent;

        break;
      default:
        Content = ProjectContent;
        break;
    }
  }

  const colorLineNode = list.color && (
    <div
      className={classNames(
        styles.colorLine,
        !list.color.startsWith('#') &&
          globalStyles[`background${upperFirst(camelCase(list.color))}`],
      )}
      style={list.color.startsWith('#') ? { backgroundColor: list.color } : null}
    />
  );

  const isDimmed =
    focusedCardId && focusedCardId !== id && !relatedCardIds.has(id) && relatedCardIds.size > 0;

  return (
    <div
      className={classNames(
        styles.wrapper,
        isHighlightedAsRecent && styles.wrapperRecent,
        isDimmed && styles.wrapperDimmed,
        'card',
      )}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {card.isPersisted ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                                       jsx-a11y/no-static-element-interactions */}
          <div
            className={classNames(
              styles.content,
              list.type === ListTypes.CLOSED && styles.contentDisabled,
            )}
            onClick={handleClick}
          >
            <Content cardId={id} isBlocked={isBlocked} />
            {colorLineNode}
          </div>
          {canUseActions && (
            <ActionsPopup cardId={id} onNameEdit={handleNameEdit}>
              <Button className={styles.actionsButton}>
                <Icon fitted name="pencil" size="small" />
              </Button>
            </ActionsPopup>
          )}
        </>
      ) : (
        <span
          className={classNames(
            styles.content,
            list.type === ListTypes.CLOSED && styles.contentDisabled,
          )}
        >
          <Content cardId={id} isBlocked={isBlocked} />
          {colorLineNode}
        </span>
      )}
    </div>
  );
});

Card.propTypes = {
  id: PropTypes.string.isRequired,
  isInline: PropTypes.bool,
};

export default Card;
