/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Icon, Tab } from 'semantic-ui-react';

import selectors from '../../../selectors';
import { usePopupInClosableContext } from '../../../hooks';
import BaseCardTypeChip from '../base-card-types/BaseCardTypeChip';
import BaseCardTypeStep from '../base-card-types/BaseCardTypeStep';
import AddBaseCardTypeStep from '../base-card-types/AddBaseCardTypeStep';

import styles from './BaseCardTypesPane.module.scss';

const BaseCardTypesPane = React.memo(() => {
  const baseCardTypeIds = useSelector(selectors.selectBaseCardTypeIds);

  const BaseCardTypePopup = usePopupInClosableContext(BaseCardTypeStep);
  const AddBaseCardTypePopup = usePopupInClosableContext(AddBaseCardTypeStep);

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <div className={styles.types}>
        {baseCardTypeIds.map((baseCardTypeId) => (
          <span key={baseCardTypeId} className={styles.type}>
            <BaseCardTypePopup id={baseCardTypeId}>
              <BaseCardTypeChip id={baseCardTypeId} />
            </BaseCardTypePopup>
          </span>
        ))}
        <AddBaseCardTypePopup>
          <button type="button" className={classNames(styles.type, styles.addTypeButton)}>
            <Icon name="plus" size="small" className={styles.addTypeButtonIcon} />
          </button>
        </AddBaseCardTypePopup>
      </div>
    </Tab.Pane>
  );
});

export default BaseCardTypesPane;
