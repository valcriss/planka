import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Link } from 'react-router-dom';

import Paths from '../../../constants/Paths';

import itemStyles from './Item.module.scss';

const EpicsTab = React.memo(({ name, code, isActive = false }) => (
  <div className={itemStyles.wrapper}>
    <div className={classNames(itemStyles.tab, isActive && itemStyles.tabActive)}>
      <Link to={Paths.PROJECT_EPICS.replace(':code', code)} className={itemStyles.link}>
        <span className={itemStyles.name}>{name}</span>
      </Link>
    </div>
  </div>
));

EpicsTab.propTypes = {
  name: PropTypes.string.isRequired,
  code: PropTypes.string.isRequired,
  isActive: PropTypes.bool,
};

export default EpicsTab;
