/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Tab, Table } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { usePopupInClosableContext } from '../../../hooks';
import AddCardTypeStep from '../../card-types/AddCardTypeStep';
import Item from './CardTypesPane/Item';

import styles from './CardTypesPane.module.scss';

const CardTypesPane = React.memo(() => {
  const dispatch = useDispatch();
  const projectId = useSelector((state) => selectors.selectPath(state).projectId);

  const selectCardTypeIdsByProjectId = useMemo(
    () => selectors.makeSelectCardTypeIdsByProjectId(),
    [],
  );

  const cardTypeIds = useSelector((state) => selectCardTypeIdsByProjectId(state, projectId));
  const baseCardTypeIds = useSelector(selectors.selectBaseCardTypeIds);

  const AddCardTypePopup = usePopupInClosableContext(AddCardTypeStep);
  const [t] = useTranslation();

  useEffect(() => {
    dispatch(entryActions.fetchBaseCardTypes());
  }, [dispatch]);

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <div className={styles.actions}>
        <AddCardTypePopup>
          <Button positive className={styles.addButton}>
            {t('action.createCardType')}
          </Button>
        </AddCardTypePopup>
      </div>
      {(baseCardTypeIds.length > 0 || cardTypeIds.length > 0) && (
        <div className={styles.tableWrapper}>
          <Table unstackable basic="very">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell width={2}>{t('common.icon')}</Table.HeaderCell>
                <Table.HeaderCell>{t('common.title')}</Table.HeaderCell>
                <Table.HeaderCell width={1} />
                <Table.HeaderCell width={1} />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {baseCardTypeIds.map((id) => (
                <Item key={`base-${id}`} id={id} isBase />
              ))}
              {cardTypeIds.map((id) => (
                <Item key={id} id={id} />
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
    </Tab.Pane>
  );
});

export default CardTypesPane;
