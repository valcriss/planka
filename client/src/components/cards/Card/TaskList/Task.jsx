/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import selectors from '../../../../selectors';
import { ListTypes } from '../../../../constants/Enums';
import Linkify from '../../../common/Linkify';
import { getTaskCardLinks } from '../../../../utils/task-card-links';

import styles from './Task.module.scss';

const Task = React.memo(({ id }) => {
  const selectTaskById = useMemo(() => selectors.makeSelectTaskById(), []);
  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);
  const selectCardByProjectCodeAndNumber = useMemo(
    () => selectors.makeSelectCardByProjectCodeAndNumber(),
    [],
  );
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);

  const task = useSelector((state) => selectTaskById(state, id));
  const linkedCardReferences = useMemo(() => getTaskCardLinks(task.name), [task.name]);

  const isLinkedCardCompleted = useSelector((state) => {
    // eslint-disable-next-line no-restricted-syntax
    for (const link of linkedCardReferences) {
      let card;
      if (link.projectCode) {
        card = selectCardByProjectCodeAndNumber(state, link.projectCode, link.number);
      } else {
        card = selectCardById(state, link.id);
      }

      if (card) {
        const list = selectListById(state, card.listId);

        if (list?.type === ListTypes.CLOSED) {
          return true;
        }
      }
    }

    return false;
  });

  const isCompleted = task.isCompleted || isLinkedCardCompleted;

  return (
    <li className={classNames(styles.wrapper, isCompleted && styles.wrapperCompleted)}>
      <Linkify linkStopPropagation>{task.name}</Linkify>
    </li>
  );
});

Task.propTypes = {
  id: PropTypes.string.isRequired,
};

export default Task;
