import upperFirst from 'lodash/upperFirst';
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import styles from './StoryPointsChip.module.scss';

const Sizes = {
  TINY: 'tiny',
  SMALL: 'small',
  MEDIUM: 'medium',
};

const StoryPointsChip = React.memo(({ value, size = Sizes.MEDIUM, className = undefined }) => (
  <span className={classNames(styles.wrapper, styles[`wrapper${upperFirst(size)}`], className)}>
    {value}
  </span>
));

StoryPointsChip.propTypes = {
  value: PropTypes.number.isRequired,
  size: PropTypes.oneOf(Object.values(Sizes)),
  className: PropTypes.string,
};

export default StoryPointsChip;
