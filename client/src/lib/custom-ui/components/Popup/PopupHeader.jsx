/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Button, Popup as SemanticUIPopup } from 'semantic-ui-react';

import styles from './PopupHeader.module.css';

const PopupHeader = React.memo(({ children, onBack = undefined }) => (
  <SemanticUIPopup.Header className={styles.wrapper}>
    {onBack && <Button icon="angle left" onClick={onBack} className={styles.backButton} />}
    <div className={styles.content}>{children}</div>
  </SemanticUIPopup.Header>
));

PopupHeader.propTypes = {
  children: PropTypes.node.isRequired,
  onBack: PropTypes.func,
};

// defaultProps removed in favor of parameter default

export default PopupHeader;
