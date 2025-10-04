/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import styles from './ListMetricChip.module.scss';

const ListMetricChip = React.memo(({ filteredCount = null, totalCount, className = undefined }) => {
  const displayValue = useMemo(() => {
    const total = Number.isFinite(totalCount) ? totalCount : 0;

    if (Number.isFinite(filteredCount) && filteredCount !== total) {
      return `${filteredCount}/${total}`;
    }

    return `${total}`;
  }, [filteredCount, totalCount]);

  return <span className={classNames(styles.wrapper, className)}>{displayValue}</span>;
});

ListMetricChip.propTypes = {
  filteredCount: PropTypes.number,
  totalCount: PropTypes.number.isRequired,
  className: PropTypes.string,
};

export default ListMetricChip;
