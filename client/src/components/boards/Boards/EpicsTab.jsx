import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import itemStyles from './Item.module.scss';

const EpicsTab = React.memo(({ name }) => (
  <div className={itemStyles.wrapper}>
    <div className={itemStyles.tab}>
      <span className={classNames(itemStyles.name, itemStyles.link)}>{name}</span>
    </div>
  </div>
));

EpicsTab.propTypes = {
  name: PropTypes.string.isRequired,
};

export default EpicsTab;
