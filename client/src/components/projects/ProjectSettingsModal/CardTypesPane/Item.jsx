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

import styles from './Item.module.scss';

const Item = React.memo(({ id, isBase }) => {
  const selectById = useMemo(
    () => (isBase ? selectors.makeSelectBaseCardTypeById() : selectors.makeSelectCardTypeById()),
    [isBase],
  );
  const item = useSelector((state) => selectById(state, id));
  const dispatch = useDispatch();

  const handleDelete = useCallback(() => {
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
          <Button type="button" className={styles.button} onClick={handleDelete}>
            <Icon fitted name="trash alternate outline" />
          </Button>
        </Table.Cell>
      )}
      {isBase && <Table.Cell />}
    </Table.Row>
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
  isBase: PropTypes.bool,
};

Item.defaultProps = {
  isBase: false,
};

export default Item;
