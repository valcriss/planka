import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  differenceInCalendarDays,
  addMonths,
  addYears,
  startOfDay,
} from 'date-fns';

import styles from './Gantt.module.scss';

const DAY_WIDTH = 24; // px width per day
const ROW_HEIGHT = 24; // px height per task row

const Gantt = React.memo(({ tasks }) => {
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
      <div className={styles.leftColumn}>
        {tasks.map((task) => (
          <div key={task.name} className={styles.row} style={{ height: ROW_HEIGHT }}>
            {task.name}
          </div>
        ))}
      </div>
      <div className={styles.rightColumn}>
        <div
          className={styles.timeline}
          style={{ width: range.totalDays * DAY_WIDTH }}
        >
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
