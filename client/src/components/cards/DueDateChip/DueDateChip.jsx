/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import upperFirst from 'lodash/upperFirst';
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { useForceUpdate } from '../../../lib/hooks';

import getDateFormat from '../../../utils/get-date-format';

import styles from './DueDateChip.module.scss';

const Sizes = {
  TINY: 'tiny',
  SMALL: 'small',
  MEDIUM: 'medium',
};

// Nouveaux statuts:
// - dueTomorrow: la veille de la date d'échéance (badge jaune)
// - dueToday: le jour de l'échéance (badge orange)
// - overdue: après la date (badge rouge)
const Statuses = {
  DUE_TOMORROW: 'dueTomorrow',
  DUE_TODAY: 'dueToday',
  OVERDUE: 'overdue',
};

const LONG_DATE_FORMAT_BY_SIZE = {
  [Sizes.TINY]: 'longDate',
  [Sizes.SMALL]: 'longDate',
  [Sizes.MEDIUM]: 'longDateTime',
};

const FULL_DATE_FORMAT_BY_SIZE = {
  [Sizes.TINY]: 'fullDate',
  [Sizes.SMALL]: 'fullDate',
  [Sizes.MEDIUM]: 'fullDateTime',
};

const STATUS_ICON_PROPS_BY_STATUS = {
  [Statuses.DUE_TOMORROW]: {
    name: 'hourglass start',
    color: 'yellow',
  },
  [Statuses.DUE_TODAY]: {
    name: 'hourglass half',
    color: 'orange',
  },
  [Statuses.OVERDUE]: {
    name: 'hourglass end',
    color: 'red',
  },
};

const getStatus = (date) => {
  const now = new Date();
  const target = date;

  // On normalise pour comparer les jours civils
  const y = (d) => d.getFullYear();
  const m = (d) => d.getMonth();
  const day = (d) => d.getDate();

  const isSameDay = y(now) === y(target) && m(now) === m(target) && day(now) === day(target);

  // Créer un objet date pour 'demain' (jour civil suivant)
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const isTomorrow =
    y(tomorrow) === y(target) && m(tomorrow) === m(target) && day(tomorrow) === day(target);

  if (date.getTime() < now.getTime()) {
    return Statuses.OVERDUE;
  }

  if (isSameDay) {
    return Statuses.DUE_TODAY;
  }

  if (isTomorrow) {
    return Statuses.DUE_TOMORROW;
  }

  return null;
};

const DueDateChip = React.memo(
  ({
    value,
    size = Sizes.MEDIUM,
    isDisabled = false,
    withStatus,
    withStatusIcon = false,
    onClick,
  }) => {
    const [t] = useTranslation();
    const forceUpdate = useForceUpdate();

    const statusRef = useRef(null);
    statusRef.current = withStatus ? getStatus(value) : null;

    const intervalRef = useRef(null);

    const dateFormat = getDateFormat(
      value,
      LONG_DATE_FORMAT_BY_SIZE[size],
      FULL_DATE_FORMAT_BY_SIZE[size],
    );

    useEffect(() => {
      if (withStatus && statusRef.current !== Statuses.OVERDUE) {
        intervalRef.current = setInterval(() => {
          const status = getStatus(value);

          if (status !== statusRef.current) {
            forceUpdate();
          }

          if (status === Statuses.OVERDUE) {
            clearInterval(intervalRef.current);
          }
        }, 1000);
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [value, withStatus, forceUpdate]);

    const contentNode = (
      <span
        className={classNames(
          styles.wrapper,
          styles[`wrapper${upperFirst(size)}`],
          !withStatusIcon && statusRef.current && styles[`wrapper${upperFirst(statusRef.current)}`],
          onClick && styles.wrapperHoverable,
        )}
      >
        {t(`format:${dateFormat}`, {
          value,
          postProcess: 'formatDate',
        })}
        {withStatusIcon && statusRef.current && (
          // eslint-disable-next-line react/jsx-props-no-spreading
          <Icon {...STATUS_ICON_PROPS_BY_STATUS[statusRef.current]} className={styles.statusIcon} />
        )}
      </span>
    );

    return onClick ? (
      <button type="button" disabled={isDisabled} className={styles.button} onClick={onClick}>
        {contentNode}
      </button>
    ) : (
      contentNode
    );
  },
);

DueDateChip.propTypes = {
  value: PropTypes.instanceOf(Date).isRequired,
  size: PropTypes.oneOf(Object.values(Sizes)),
  isDisabled: PropTypes.bool,
  withStatus: PropTypes.bool.isRequired,
  withStatusIcon: PropTypes.bool,
  onClick: PropTypes.func,
};

export default DueDateChip;
