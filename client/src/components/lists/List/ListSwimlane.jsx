/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Droppable } from '@hello-pangea/dnd';

import selectors from '../../../selectors';
import DroppableTypes from '../../../constants/DroppableTypes';
import { BoardSwimlaneTypes } from '../../../constants/Enums';
import DraggableCard from '../../cards/DraggableCard';
import AddCard from '../../cards/AddCard';
import PlusMathIcon from '../../../assets/images/plus-math-icon.svg?react';
import UserAvatar from '../../users/UserAvatar';
import LabelChip from '../../labels/LabelChip';
import EpicChip from '../../epics/EpicChip';

import styles from './ListSwimlane.module.scss';

const UNKNOWN_LABEL = 'Unknown';

const ListSwimlane = React.memo(
  ({
    lane,
    laneKey,
    listId,
    swimlaneType,
    canAddCard,
    canDropCard,
    isLimitBlocking,
    isListPersisted,
    isAddCardOpened,
    onCardCreate,
    onAddCardOpen,
    onAddCardClose,
  }) => {
    const [t] = useTranslation();

    const selectUserById = useMemo(() => selectors.makeSelectUserById(), []);
    const selectLabelById = useMemo(() => selectors.makeSelectLabelById(), []);
    const selectEpicById = useMemo(() => selectors.makeSelectEpicById(), []);

    const laneParts = useMemo(() => laneKey.split(':'), [laneKey]);
    const laneEntityId = laneParts.length > 1 ? laneParts[1] : null;

    const user = useSelector((state) => selectUserById(state, laneEntityId));
    const label = useSelector((state) => selectLabelById(state, laneEntityId));
    const epic = useSelector((state) => selectEpicById(state, laneEntityId));

    const laneCardIds = useMemo(() => lane.cardIds || [], [lane.cardIds]);
    const laneCardCount = useMemo(() => new Set(laneCardIds).size, [laneCardIds]);

    const handleAddCardClick = useCallback(() => {
      if (isLimitBlocking || !isListPersisted) {
        return;
      }

      onAddCardOpen(laneKey);
    }, [isLimitBlocking, isListPersisted, onAddCardOpen, laneKey]);

    const handleAddCardClose = useCallback(() => {
      onAddCardClose();
    }, [onAddCardClose]);

    const handleCardCreate = useCallback(
      (data, autoOpen) => {
        onCardCreate(data, autoOpen);
      },
      [onCardCreate],
    );

    const fallbackTitle = useMemo(
      () => (
        <span className={styles.titleText}>
          {t('common.unknown', { defaultValue: UNKNOWN_LABEL })}
        </span>
      ),
      [t],
    );

    const laneTitleNode = useMemo(() => {
      if (laneKey === 'unassigned') {
        return (
          <span className={styles.unassignedBadge}>
            {t('common.unassigned', { defaultValue: 'Unassigned' })}
          </span>
        );
      }

      switch (swimlaneType) {
        case BoardSwimlaneTypes.MEMBERS: {
          if (!laneEntityId || !user) {
            return fallbackTitle;
          }

          return (
            <span className={styles.memberTitle}>
              <UserAvatar id={laneEntityId} size="small" className={styles.memberAvatar} />
              <span className={styles.memberName}>{user.name || user.username}</span>
            </span>
          );
        }
        case BoardSwimlaneTypes.LABELS: {
          if (!laneEntityId || !label) {
            return fallbackTitle;
          }

          return (
            <span className={styles.labelTitle}>
              <LabelChip id={laneEntityId} size="small" />
            </span>
          );
        }
        case BoardSwimlaneTypes.EPICS: {
          if (!laneEntityId || !epic) {
            return fallbackTitle;
          }

          return (
            <span className={styles.epicTitle}>
              <EpicChip id={laneEntityId} size="small" />
            </span>
          );
        }
        default:
          return <span className={styles.titleText}>{laneKey}</span>;
      }
    }, [laneKey, swimlaneType, laneEntityId, user, label, epic, fallbackTitle, t]);

    const droppableId = useMemo(() => `list:${listId}:lane:${laneKey}`, [laneKey, listId]);

    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>{laneTitleNode}</div>
          {Number.isFinite(laneCardCount) && (
            <span className={styles.headerCount}>{laneCardCount}</span>
          )}
        </div>
        <Droppable
          droppableId={droppableId}
          type={DroppableTypes.CARD}
          isDropDisabled={!isListPersisted || !canDropCard || isLimitBlocking}
        >
          {({ innerRef, droppableProps, placeholder }) => (
            // eslint-disable-next-line react/jsx-props-no-spreading
            <div {...droppableProps} ref={innerRef} className={styles.cards}>
              {laneCardIds.map((cardId, cardIndex) => (
                <DraggableCard
                  key={`${laneKey}:${cardId}`}
                  id={cardId}
                  index={cardIndex}
                  laneKey={laneKey}
                  className={styles.card}
                />
              ))}
              {placeholder ? <div className={styles.placeholder}>{placeholder}</div> : null}
              {canAddCard && !isLimitBlocking && (
                <AddCard
                  isOpened={isAddCardOpened}
                  className={styles.addCard}
                  listId={listId}
                  onCreate={handleCardCreate}
                  onClose={handleAddCardClose}
                />
              )}
            </div>
          )}
        </Droppable>
        {canAddCard && !isLimitBlocking && !isAddCardOpened && (
          <button
            type="button"
            disabled={!isListPersisted || isLimitBlocking}
            className={styles.addCardButton}
            onClick={handleAddCardClick}
          >
            <PlusMathIcon className={styles.addCardButtonIcon} />
            <span className={styles.addCardButtonText}>
              {laneCardCount > 0 ? t('action.addAnotherCard') : t('action.addCard')}
            </span>
          </button>
        )}
      </div>
    );
  },
);

ListSwimlane.propTypes = {
  lane: PropTypes.shape({
    id: PropTypes.string.isRequired,
    cardIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  laneKey: PropTypes.string.isRequired,
  listId: PropTypes.string.isRequired,
  swimlaneType: PropTypes.oneOf(Object.values(BoardSwimlaneTypes)).isRequired,
  canAddCard: PropTypes.bool.isRequired,
  canDropCard: PropTypes.bool.isRequired,
  isLimitBlocking: PropTypes.bool.isRequired,
  isListPersisted: PropTypes.bool.isRequired,
  isAddCardOpened: PropTypes.bool.isRequired,
  onCardCreate: PropTypes.func.isRequired,
  onAddCardOpen: PropTypes.func.isRequired,
  onAddCardClose: PropTypes.func.isRequired,
};

export default ListSwimlane;
