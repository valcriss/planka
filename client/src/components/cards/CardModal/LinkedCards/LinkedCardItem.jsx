/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Button, Icon } from 'semantic-ui-react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import history from '../../../../history';
import selectors from '../../../../selectors';
import Paths from '../../../../constants/Paths';

import styles from './LinkedCards.module.scss';

const LinkedCardItem = React.memo(
  ({ cardLinkId, linkedCardId, name, typeLabel, canEdit, onRemove, isRemoving, removeLabel }) => {
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

    return (
      <div className={styles.listRow}>
        <button type="button" className={styles.cardButton} onClick={handleOpen}>
          {displayName}
        </button>
        <div className={styles.typeCell}>{typeLabel}</div>
        <div className={styles.actionsCell}>
          {canEdit && (
            <Button
              basic
              icon
              negative
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
  canEdit: PropTypes.bool.isRequired,
  onRemove: PropTypes.func.isRequired,
  isRemoving: PropTypes.bool,
  removeLabel: PropTypes.string.isRequired,
};

LinkedCardItem.defaultProps = {
  name: null,
  isRemoving: false,
};

export default LinkedCardItem;
