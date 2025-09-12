/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import upperFirst from 'lodash/upperFirst';
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Icon } from 'semantic-ui-react';

import selectors from '../../../selectors';

import styles from './BaseCardTypeChip.module.scss';

const Sizes = {
  TINY: 'tiny',
  SMALL: 'small',
  MEDIUM: 'medium',
};

const BaseCardTypeChip = React.memo(({ id, size, onClick }) => {
  const selectBaseCardTypeById = useMemo(() => selectors.makeSelectBaseCardTypeById(), []);

  const baseCardType = useSelector((state) => selectBaseCardTypeById(state, id));

  const contentNode = (
    <span
      title={baseCardType.name}
      className={classNames(
        styles.wrapper,
        styles[`wrapper${upperFirst(size)}`],
        onClick && styles.wrapperHoverable,
      )}
      style={{ background: baseCardType.color || '#dce0e4', color: '#fff' }}
    >
      {baseCardType.icon && <Icon name={baseCardType.icon} className={styles.icon} />}
      {baseCardType.name}
    </span>
  );

  return onClick ? (
    <button
      type="button"
      disabled={!baseCardType.isPersisted}
      className={styles.button}
      onClick={onClick}
    >
      {contentNode}
    </button>
  ) : (
    contentNode
  );
});

BaseCardTypeChip.propTypes = {
  id: PropTypes.string.isRequired,
  size: PropTypes.oneOf(Object.values(Sizes)),
  onClick: PropTypes.func,
};

BaseCardTypeChip.defaultProps = {
  size: Sizes.MEDIUM,
  onClick: undefined,
};

export default BaseCardTypeChip;
