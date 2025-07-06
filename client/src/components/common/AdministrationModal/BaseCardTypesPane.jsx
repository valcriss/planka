/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Tab, Table } from 'semantic-ui-react';

import selectors from '../../../selectors';
import { usePopupInClosableContext } from '../../../hooks';
import AddBaseCardTypeStep from '../../base-card-types/AddBaseCardTypeStep';
import Item from './BaseCardTypesPane/Item';

import styles from './BaseCardTypesPane.module.scss';

const BaseCardTypesPane = React.memo(() => {
  const baseCardTypeIds = useSelector(selectors.selectBaseCardTypeIds);

  const AddBaseCardTypePopup = usePopupInClosableContext(AddBaseCardTypeStep);
  const [t] = useTranslation();

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <div className={styles.actions}>
        <AddBaseCardTypePopup>
          <Button positive className={styles.addButton}>
            {t('action.createCardType')}
          </Button>
        </AddBaseCardTypePopup>
      </div>
      {baseCardTypeIds.length > 0 && (
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
              {baseCardTypeIds.map((baseCardTypeId) => (
                <Item key={baseCardTypeId} id={baseCardTypeId} />
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
    </Tab.Pane>
  );
});

export default BaseCardTypesPane;
