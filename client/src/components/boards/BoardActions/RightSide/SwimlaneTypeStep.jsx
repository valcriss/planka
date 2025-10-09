/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Menu } from 'semantic-ui-react';
import { Popup } from '../../../../lib/custom-ui';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { BoardSwimlaneTypes } from '../../../../constants/Enums';

import styles from './ActionsStep.module.scss';

const SwimlaneTypeStep = React.memo(({ onClose }) => {
  const board = useSelector(selectors.selectCurrentBoard);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const swimlaneType = board?.swimlaneType ?? BoardSwimlaneTypes.NONE;

  const handleSelect = useCallback(
    (_, { value }) => {
      if (value !== swimlaneType && board) {
        dispatch(
          entryActions.updateBoard(board.id, {
            swimlaneType: value,
          }),
        );
      }

      onClose();
    },
    [board, dispatch, onClose, swimlaneType],
  );

  return (
    <>
      <Popup.Header>{t('common.swimlaneType')}</Popup.Header>
      <Popup.Content>
        <Menu secondary vertical className={styles.menu}>
          {Object.values(BoardSwimlaneTypes).map((value) => (
            <Menu.Item
              key={value}
              value={value}
              active={value === swimlaneType}
              className={styles.menuItem}
              onClick={handleSelect}
            >
              {t(`common.boardSwimlaneTypes.${value}`)}
            </Menu.Item>
          ))}
        </Menu>
      </Popup.Content>
    </>
  );
});

SwimlaneTypeStep.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default SwimlaneTypeStep;
