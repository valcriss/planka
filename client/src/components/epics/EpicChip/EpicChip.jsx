import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import selectors from '../../../selectors';
import getTextColor from '../../../utils/get-text-color';

import styles from './EpicChip.module.scss';

const Sizes = {
  TINY: 'tiny',
  SMALL: 'small',
  MEDIUM: 'medium',
};

const EpicChip = React.memo(({ id, size }) => {
  const selectEpicById = useMemo(() => selectors.makeSelectEpicById(), []);
  const epic = useSelector((state) => selectEpicById(state, id));

  if (!epic) return null;

  return (
    <span
      title={epic.name}
      className={classNames(
        styles.wrapper,
        styles[`wrapper${size.charAt(0).toUpperCase() + size.slice(1)}`],
      )}
      style={{ background: epic.color || '#dce0e4', color: getTextColor(epic.color) }}
    >
      {epic.name}
    </span>
  );
});

EpicChip.propTypes = {
  id: PropTypes.string.isRequired,
  size: PropTypes.oneOf(Object.values(Sizes)),
};

EpicChip.defaultProps = {
  size: Sizes.MEDIUM,
};

export default EpicChip;
