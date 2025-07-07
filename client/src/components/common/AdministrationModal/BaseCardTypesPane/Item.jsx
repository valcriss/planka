import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Icon, Table } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { usePopupInClosableContext } from '../../../../hooks';
import BaseCardTypeStep from '../../../base-card-types/BaseCardTypeStep';
import ConfirmationStep from '../../ConfirmationStep';

import styles from './Item.module.scss';

const Item = React.memo(({ id }) => {
  const selectBaseCardTypeById = useMemo(() => selectors.makeSelectBaseCardTypeById(), []);
  const baseCardType = useSelector((state) => selectBaseCardTypeById(state, id));

  const dispatch = useDispatch();

  const EditPopup = usePopupInClosableContext(BaseCardTypeStep);
  const ConfirmationPopup = usePopupInClosableContext(ConfirmationStep);

  const handleDeleteConfirm = useCallback(() => {
    dispatch(entryActions.deleteBaseCardType(id));
  }, [dispatch, id]);

  return (
    <Table.Row>
      <Table.Cell textAlign="center">
        {baseCardType.icon && (
          <Icon name={baseCardType.icon} style={{ color: baseCardType.color || '#000' }} />
        )}
      </Table.Cell>
      <Table.Cell>{baseCardType.name}</Table.Cell>
      <Table.Cell textAlign="right">
        <EditPopup id={id}>
          <Button className={styles.button}>
            <Icon fitted name="pencil" />
          </Button>
        </EditPopup>
      </Table.Cell>
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
    </Table.Row>
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
};

export default Item;
