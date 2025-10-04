/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { Button, Icon, Table } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { usePopupInClosableContext } from '../../../../hooks';
import { CardTypeStep } from '../../../card-types';
import ConfirmationStep from '../../../common/ConfirmationStep';

import styles from './Item.module.scss';

const Item = React.memo(({ id, isBase = false }) => {
  const selectById = useMemo(
    () => (isBase ? selectors.makeSelectBaseCardTypeById() : selectors.makeSelectCardTypeById()),
    [isBase],
  );
  const item = useSelector((state) => selectById(state, id));
  const dispatch = useDispatch();

  const EditPopup = usePopupInClosableContext(CardTypeStep);
  const ConfirmationPopup = usePopupInClosableContext(ConfirmationStep);

  const handleDeleteConfirm = useCallback(() => {
    dispatch(entryActions.deleteCardType(id));
  }, [dispatch, id]);

  return (
    <Table.Row>
      <Table.Cell textAlign="center">
        {item.icon && <Icon name={item.icon} style={{ color: item.color || '#000' }} />}
      </Table.Cell>
      <Table.Cell>{item.name}</Table.Cell>
      {!isBase && (
        <Table.Cell textAlign="right">
          <EditPopup id={id}>
            <Button className={styles.button}>
              <Icon fitted name="pencil" />
            </Button>
          </EditPopup>
        </Table.Cell>
      )}
      {!isBase && (
        <Table.Cell textAlign="right">
          <ConfirmationPopup
            title="common.deleteCardType"
            content="common.areYouSureYouWantToDeleteThisCardType"
            buttonContent="action.deleteCardType"
            onConfirm={handleDeleteConfirm}
          >
            <Button type="button" className={styles.button}>
              <Icon fitted name="trash alternate outline" />
            </Button>
          </ConfirmationPopup>
        </Table.Cell>
      )}
      {isBase && <Table.Cell />}
      {isBase && <Table.Cell />}
    </Table.Row>
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
  isBase: PropTypes.bool,
};

export default Item;
