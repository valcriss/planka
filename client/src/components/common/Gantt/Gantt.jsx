import React, { useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  differenceInCalendarDays,
  addMonths,
  addYears,
  addDays,
  startOfDay,
  startOfMonth,
  endOfMonth,
  format,
} from 'date-fns';

import styles from './Gantt.module.scss';

const DAY_WIDTH = 32; // px width per day
const ROW_HEIGHT = 32; // px height per task row

const Gantt = React.memo(({ tasks }) => {
  const { t } = useTranslation();
  const headerRef = useRef(null);
  const bodyRef = useRef(null);
  const range = useMemo(() => {
    const today = startOfDay(new Date());
    let firstStart = null;
    tasks.forEach((task) => {
      if (task.startDate && (!firstStart || task.startDate < firstStart)) {
        firstStart = startOfDay(task.startDate);
      }
    });

    const baseStart = firstStart || today;
    const start = addMonths(baseStart, -1);
    const end = addYears(today, 1);
    const totalDays = differenceInCalendarDays(end, start) + 1;
    return { start, end, totalDays };
  }, [tasks]);

  const days = useMemo(
    () => Array.from({ length: range.totalDays }, (_, i) => addDays(range.start, i)),
    [range],
  );

  const months = useMemo(() => {
    const result = [];
    let cursor = startOfMonth(range.start);
    while (cursor <= range.end) {
      const monthStart = cursor < range.start ? range.start : cursor;
      const monthEnd = endOfMonth(cursor) < range.end ? endOfMonth(cursor) : range.end;
      const daysInMonth = differenceInCalendarDays(monthEnd, monthStart) + 1;
      result.push({ start: cursor, days: daysInMonth });
      cursor = addMonths(cursor, 1);
    }
    return result;
  }, [range]);

  const handleHeaderScroll = () => {
    if (bodyRef.current && headerRef.current) {
      bodyRef.current.scrollLeft = headerRef.current.scrollLeft;
    }
  };

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const getBarStyle = (task) => {
    if (!task.startDate || !task.endDate) {
      return null;
    }
    const offsetDays = differenceInCalendarDays(startOfDay(task.startDate), range.start);
    const durationDays =
      differenceInCalendarDays(startOfDay(task.endDate), startOfDay(task.startDate)) + 1;
    const progressWidth = `${task.progress}%`;
    return {
      offset: offsetDays * DAY_WIDTH,
      width: durationDays * DAY_WIDTH,
      progressWidth,
    };
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerRow}>
        <div className={styles.leftHeader}>{t('common.epics')}</div>
        <div className={styles.rightHeader} ref={headerRef} onScroll={handleHeaderScroll}>
          <div className={styles.monthRow} style={{ width: range.totalDays * DAY_WIDTH }}>
            {months.map((month) => (
              <div
                key={month.start.toISOString()}
                className={styles.monthCell}
                style={{ width: month.days * DAY_WIDTH }}
              >
                {format(month.start, 'MMM')}
              </div>
            ))}
          </div>
          <div className={styles.dayRow} style={{ width: range.totalDays * DAY_WIDTH }}>
            {days.map((day) => (
              <div key={day.toISOString()} className={styles.dayCell} style={{ width: DAY_WIDTH }}>
                {format(day, 'd')}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.leftColumn}>
          {tasks.map((task) => (
            <div key={task.name} className={styles.epicRow} style={{ height: ROW_HEIGHT }}>
              {task.name}
            </div>
          ))}
        </div>
        <div className={styles.rightColumn} ref={bodyRef} onScroll={handleBodyScroll}>
          <div className={styles.timeline} style={{ width: range.totalDays * DAY_WIDTH }}>
            {tasks.map((task) => {
              const bar = getBarStyle(task);
              return (
                <div key={task.name} className={styles.row} style={{ height: ROW_HEIGHT }}>
                  {bar && (
                    <div
                      className={styles.bar}
                      style={{
                        left: bar.offset,
                        width: bar.width,
                        backgroundColor: task.color,
                      }}
                    >
                      <div
                        className={styles.progress}
                        style={{
                          width: bar.progressWidth,
                          backgroundColor: task.color,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

Gantt.propTypes = {
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      color: PropTypes.string,
      startDate: PropTypes.instanceOf(Date),
      endDate: PropTypes.instanceOf(Date),
      progress: PropTypes.number,
    }),
  ).isRequired,
};

export default Gantt;
