/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon, Menu } from 'semantic-ui-react';

import selectors from '../../../selectors';
import { CardTypes } from '../../../constants/Enums';
import { CardTypeIcons } from '../../../constants/Icons';

import styles from './SelectCardType.module.scss';

const DESCRIPTION_BY_TYPE = {
  [CardTypes.PROJECT]: 'common.taskAssignmentAndProjectCompletion',
  [CardTypes.STORY]: 'common.referenceDataAndKnowledgeStorage',
};

const SelectCardType = React.memo(({ projectId, value, onSelect }) => {
  const [t] = useTranslation();
  const selectCardTypeIdsByProjectId = useMemo(
    () => selectors.makeSelectCardTypeIdsByProjectId(),
    [],
  );
  const selectCardTypeById = useMemo(
    () => selectors.makeSelectCardTypeById(),
    [],
  );

  const cardTypeIds = useSelector((state) =>
    selectCardTypeIdsByProjectId(state, projectId),
  );

  const cardTypes = useSelector((state) =>
    (cardTypeIds || []).map((id) => selectCardTypeById(state, id)),
  );

  const handleSelectClick = useCallback(
    (_, { value: nextValue }) => {
      if (nextValue !== value) {
        const ct = cardTypes.find((item) => item && item.id === nextValue);
        onSelect(nextValue, ct ? ct.name : nextValue);
      }
    },
    [value, onSelect, cardTypes],
  );

  return (
    <Menu secondary vertical className={styles.menu}>
      {(cardTypes.length > 0
        ? cardTypes
        : [
            { id: CardTypes.PROJECT, name: CardTypes.PROJECT },
            { id: CardTypes.STORY, name: CardTypes.STORY },
          ]
      ).map((ct) => (
        <Menu.Item
          key={ct.id}
          value={ct.id}
          active={ct.id === value}
          className={styles.menuItem}
          onClick={handleSelectClick}
        >
          <Icon
            name={(ct && ct.icon) || CardTypeIcons[ct.name]}
            className={styles.menuItemIcon}
          />
          <div className={styles.menuItemTitle}>{t(`common.${ct.name}`)}</div>
          <p className={styles.menuItemDescription}>{t(DESCRIPTION_BY_TYPE[ct.name] || '')}</p>
        </Menu.Item>
      ))}
    </Menu>
  );
});

SelectCardType.propTypes = {
  projectId: PropTypes.string,
  value: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
};

SelectCardType.defaultProps = {
  projectId: undefined,
};

export default SelectCardType;
