import React, { useMemo, useRef, useState, useEffect } from 'react';
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

const getTextColor = (hex) => {
  if (!hex) return '#000';
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000' : '#fff';
};

const Gantt = React.memo(({ tasks, onChange, onEpicClick }) => {
  const { t } = useTranslation();
  const headerRef = useRef(null);
  const bodyRef = useRef(null);
  const [localTasks, setLocalTasks] = useState(tasks);
  const resizeRef = useRef(null);
  const dragRef = useRef(null);
  const disableScroll = () => {
    if (headerRef.current) {
      headerRef.current.style.overflowX = 'hidden';
    }
    if (bodyRef.current) {
      bodyRef.current.style.overflowX = 'hidden';
    }
  };

  const enableScroll = () => {
    if (headerRef.current) {
      headerRef.current.style.overflowX = 'auto';
    }
    if (bodyRef.current) {
      bodyRef.current.style.overflowX = 'auto';
    }
  };

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);
  const range = useMemo(() => {
    const today = startOfDay(new Date());
    let firstStart = null;
    localTasks.forEach((task) => {
      if (task.startDate && (!firstStart || task.startDate < firstStart)) {
        firstStart = startOfDay(task.startDate);
      }
    });

    const baseStart = firstStart || today;
    const start = addDays(baseStart, -7);
    const end = addYears(today, 1);
    const totalDays = differenceInCalendarDays(end, start) + 1;
    return { start, end, totalDays };
  }, [localTasks]);

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

  const handleMouseMove = (e) => {
    const info = resizeRef.current;
    if (!info) return;
    const deltaX = e.clientX - info.startX;
    const deltaDays = Math.round(deltaX / DAY_WIDTH);
    info.deltaDays = deltaDays;
    setLocalTasks((prev) => {
      const newTasks = [...prev];
      const ts = { ...newTasks[info.index] };
      if (info.side === 'start') {
        const newStart = addDays(info.initialStart, deltaDays);
        if (newStart <= ts.endDate) {
          ts.startDate = newStart;
          info.newStartDate = newStart;
        }
      } else {
        const newEnd = addDays(info.initialEnd, deltaDays);
        if (newEnd >= ts.startDate) {
          ts.endDate = newEnd;
          info.newEndDate = newEnd;
        }
      }
      newTasks[info.index] = ts;
      return newTasks;
    });
  };

  const stopResize = () => {
    const info = resizeRef.current;
    if (!info) return;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResize);
    const task = localTasks[info.index];
    let { startDate } = task;
    let { endDate } = task;
    if (info.side === 'start' && info.newStartDate) {
      startDate = info.newStartDate;
    }
    if (info.side === 'end' && info.newEndDate) {
      endDate = info.newEndDate;
    }
    if (onChange) {
      onChange(task.id, { startDate, endDate });
    }
    enableScroll();
    resizeRef.current = null;
  };

  const startResize = (index, side) => (e) => {
    e.stopPropagation();
    const task = localTasks[index];
    if (!task.startDate || !task.endDate) return;
    resizeRef.current = {
      index,
      side,
      startX: e.clientX,
      initialStart: task.startDate,
      initialEnd: task.endDate,
      deltaDays: 0,
      newStartDate: task.startDate,
      newEndDate: task.endDate,
    };
    disableScroll();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResize);
  };

  const handleDragMove = (e) => {
    const info = dragRef.current;
    if (!info) return;
    const deltaX = e.clientX - info.startX;
    const deltaDays = Math.round(deltaX / DAY_WIDTH);
    info.deltaDays = deltaDays;
    setLocalTasks((prev) => {
      const newTasks = [...prev];
      const ts = { ...newTasks[info.index] };
      const newStart = addDays(info.initialStart, deltaDays);
      const newEnd = addDays(info.initialEnd, deltaDays);
      ts.startDate = newStart;
      ts.endDate = newEnd;
      info.newStartDate = newStart;
      info.newEndDate = newEnd;
      newTasks[info.index] = ts;
      return newTasks;
    });
  };

  const stopDrag = () => {
    const info = dragRef.current;
    if (!info) return;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', stopDrag);
    if (onChange) {
      onChange(info.taskId, { startDate: info.newStartDate, endDate: info.newEndDate });
    }
    enableScroll();
    dragRef.current = null;
  };

  const startDrag = (index) => (e) => {
    const task = localTasks[index];
    if (!task.startDate || !task.endDate) return;
    dragRef.current = {
      index,
      taskId: task.id,
      startX: e.clientX,
      initialStart: task.startDate,
      initialEnd: task.endDate,
      deltaDays: 0,
      newStartDate: task.startDate,
      newEndDate: task.endDate,
    };
    disableScroll();
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', stopDrag);
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
      <div className={styles.leftColumn}>
        {localTasks.map((task) => (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
          <div
            key={task.id}
            className={task.isChild ? styles.cardRow : styles.epicRow}
            style={{ height: ROW_HEIGHT }}
            onDoubleClick={
              !task.isChild && onEpicClick
                ? () => onEpicClick(task.id.replace('epic-', ''))
                : undefined
            }
          >
            {task.name}
          </div>
        ))}
      </div>
      <div className={styles.rightColumn} ref={bodyRef} onScroll={handleBodyScroll}>
        <div className={styles.timeline} style={{ width: range.totalDays * DAY_WIDTH }}>
          {localTasks.map((task, index) => {
            const bar = getBarStyle(task);
            return (
              <div
                key={task.id}
                className={task.isChild ? styles.cardRow : styles.row}
                style={{ height: ROW_HEIGHT }}
              >
                {bar && (
                  // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                  <div
                    className={styles.bar}
                    onMouseDown={startDrag(index)}
                    onDoubleClick={
                      !task.isChild && onEpicClick
                        ? () => onEpicClick(task.id.replace('epic-', ''))
                        : undefined
                    }
                    style={{
                      left: bar.offset,
                      width: bar.width,
                      backgroundColor: task.color,
                    }}
                  >
                    <div className={styles.label} style={{ color: getTextColor(task.color) }}>
                      {task.name}
                    </div>
                    {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                    <div className={styles.gripLeft} onMouseDown={startResize(index, 'start')} />
                    {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                    <div className={styles.gripRight} onMouseDown={startResize(index, 'end')} />
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
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string.isRequired,
      color: PropTypes.string,
      startDate: PropTypes.instanceOf(Date),
      endDate: PropTypes.instanceOf(Date),
      progress: PropTypes.number,
      isChild: PropTypes.bool,
    }),
  ).isRequired,
  // eslint-disable-next-line react/require-default-props
  onChange: PropTypes.func,
  // eslint-disable-next-line react/require-default-props
  onEpicClick: PropTypes.func,
};

export default Gantt;
