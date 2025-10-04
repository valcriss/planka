/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Button, Icon, Popup } from 'semantic-ui-react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import history from '../../../../history';
import { getCardLinkTypeIcon, getCardLinkTypeIconColor } from '../../../../constants/CardLinkIcons';
import selectors from '../../../../selectors';
import Paths from '../../../../constants/Paths';

import styles from './LinkedCards.module.scss';

const LinkedCardItem = React.memo(
  ({
    cardLinkId,
    linkedCardId,
    name = null,
    typeLabel,
    type,
    canEdit,
    onRemove,
    isRemoving = false,
    removeLabel,
  }) => {
    const [t] = useTranslation();
    const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);
    const selectBoardById = useMemo(() => selectors.makeSelectBoardById(), []);
    const selectProjectById = useMemo(() => selectors.makeSelectProjectById(), []);

    const linkedCard = useSelector((state) => selectCardById(state, linkedCardId));
    const linkedBoard = useSelector((state) =>
      linkedCard && linkedCard.boardId ? selectBoardById(state, linkedCard.boardId) : null,
    );
    const linkedProject = useSelector((state) =>
      linkedBoard ? selectProjectById(state, linkedBoard.projectId) : null,
    );

    const linkedCardPath = useMemo(() => {
      if (linkedCard && linkedProject) {
        return Paths.CARDS.replace(':projectCode', linkedProject.code).replace(
          ':number',
          linkedCard.number,
        );
      }

      return `/cards/${linkedCardId}`;
    }, [linkedCard, linkedProject, linkedCardId]);

    const displayName = name || t('common.unnamedCard');

    const handleOpen = useCallback(
      (event) => {
        event.preventDefault();
        history.push(linkedCardPath);
      },
      [linkedCardPath],
    );

    const handleRemove = useCallback(() => {
      onRemove(cardLinkId);
    }, [cardLinkId, onRemove]);

    const iconName = getCardLinkTypeIcon(type);
    const iconColor = getCardLinkTypeIconColor(type);

    // Truncation detection for card name
    const nameRef = useRef(null);
    const [isTruncated, setIsTruncated] = useState(false);

    const checkTruncation = useCallback(() => {
      if (nameRef.current) {
        const truncated = nameRef.current.scrollWidth > nameRef.current.clientWidth;
        setIsTruncated(truncated);
      }
    }, []);

    useEffect(() => {
      checkTruncation();
      // Also re-check on window resize
      window.addEventListener('resize', checkTruncation);
      return () => window.removeEventListener('resize', checkTruncation);
    }, [checkTruncation, displayName]);

    const nameButton = (
      <button
        type="button"
        ref={nameRef}
        className={styles.cardButton}
        onClick={handleOpen}
        onMouseEnter={checkTruncation}
      >
        {displayName}
      </button>
    );

    return (
      <div className={styles.listRow}>
        <div className={styles.typeCell}>
          <Icon name={iconName} color={iconColor} className={styles.typeIcon} />
          <span className={styles.typeLabel}>{typeLabel}</span>
          {isTruncated ? (
            <Popup
              position="top center"
              content={displayName}
              size="tiny"
              trigger={nameButton}
              hideOnScroll
            />
          ) : (
            nameButton
          )}
        </div>
        <div className={styles.actionsCell}>
          {canEdit && (
            <Button
              basic
              icon
              size="mini"
              className={classNames(styles.removeButton, {
                [styles.removeButtonActive]: isRemoving,
              })}
              onClick={handleRemove}
              loading={isRemoving}
              disabled={isRemoving}
              aria-label={removeLabel}
            >
              <Icon name="trash" />
            </Button>
          )}
        </div>
      </div>
    );
  },
);

LinkedCardItem.propTypes = {
  cardLinkId: PropTypes.string.isRequired,
  linkedCardId: PropTypes.string.isRequired,
  name: PropTypes.string,
  typeLabel: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  canEdit: PropTypes.bool.isRequired,
  onRemove: PropTypes.func.isRequired,
  isRemoving: PropTypes.bool,
  removeLabel: PropTypes.string.isRequired,
};

export default LinkedCardItem;
