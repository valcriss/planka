import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Icon } from 'semantic-ui-react';
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

import DroppableTypes from '../../../constants/DroppableTypes';
import globalStyles from '../../../styles.module.scss';
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

const buildGroups = (tasks) => {
  const groups = [];
  let current = null;
  tasks.forEach((task, index) => {
    if (!task.isChild) {
      current = { epicIndex: index, epic: task, childIndices: [], children: [] };
      groups.push(current);
    } else if (current) {
      current.childIndices.push(index);
      current.children.push(task);
    }
  });
  return groups;
};

const flattenGroups = (groups) => groups.reduce((acc, g) => acc.concat(g.epic, ...g.children), []);

const Gantt = React.memo(({ tasks, onChange, onEpicClick, onReorder }) => {
  const { t } = useTranslation();
  const headerRef = useRef(null);
  const bodyRef = useRef(null);
  const [localTasks, setLocalTasks] = useState(tasks);
  const [collapsedEpics, setCollapsedEpics] = useState({});
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
    if (!dragRef.current && !resizeRef.current) {
      setLocalTasks(tasks);
    }
  }, [tasks]);

  const groups = useMemo(() => buildGroups(localTasks), [localTasks]);

  useEffect(() => {
    setCollapsedEpics((prev) => {
      const next = { ...prev };
      let changed = false;
      groups.forEach((g) => {
        if (next[g.epic.id] === undefined) {
          next[g.epic.id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [groups]);

  const toggleEpic = useCallback((id) => {
    setCollapsedEpics((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const visibleItems = useMemo(() => {
    const result = [];
    groups.forEach((group) => {
      result.push({ task: group.epic, index: group.epicIndex });
      if (!collapsedEpics[group.epic.id]) {
        group.children.forEach((child, i) => {
          result.push({ task: child, index: group.childIndices[i] });
        });
      }
    });
    return result;
  }, [groups, collapsedEpics]);

  const handleDragStart = useCallback(() => {
    document.body.classList.add(globalStyles.dragging);
  }, []);

  const handleDragEnd = useCallback(
    ({ draggableId, source, destination }) => {
      document.body.classList.remove(globalStyles.dragging);

      if (!destination || source.index === destination.index) {
        return;
      }

      setLocalTasks((prev) => {
        const gs = buildGroups(prev);
        const [removed] = gs.splice(source.index, 1);
        gs.splice(destination.index, 0, removed);
        return flattenGroups(gs);
      });

      if (onReorder) {
        onReorder(draggableId, destination.index);
      }
    },
    [onReorder],
  );
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
      if (info.children) {
        info.children.forEach((child) => {
          const ct = { ...newTasks[child.index] };
          if (ct.startDate) {
            ct.startDate = addDays(child.initialStart, deltaDays);
          }
          if (ct.endDate) {
            ct.endDate = addDays(child.initialEnd, deltaDays);
          }
          newTasks[child.index] = ct;
        });
      }
      return newTasks;
    });
  };

  const stopDrag = () => {
    const info = dragRef.current;
    if (!info) return;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', stopDrag);
    if (onChange) {
      onChange(info.taskId, {
        startDate: info.newStartDate,
        endDate: info.newEndDate,
      });

      if (info.children) {
        info.children.forEach((child) => {
          const start = child.initialStart && addDays(child.initialStart, info.deltaDays);
          const end = child.initialEnd && addDays(child.initialEnd, info.deltaDays);
          onChange(child.taskId, { startDate: start, endDate: end });
        });
      }
    }
    enableScroll();
    dragRef.current = null;
  };

  const startDrag = (index) => (e) => {
    const task = localTasks[index];
    if (!task.startDate || !task.endDate) return;
    let children = null;
    if (!task.isChild) {
      const group = groups.find((g) => g.epicIndex === index);
      if (group && group.childIndices.length > 0) {
        children = group.childIndices.map((i) => ({
          index: i,
          taskId: localTasks[i].id,
          initialStart: localTasks[i].startDate,
          initialEnd: localTasks[i].endDate,
        }));
      }
    }
    dragRef.current = {
      index,
      taskId: task.id,
      startX: e.clientX,
      initialStart: task.startDate,
      initialEnd: task.endDate,
      deltaDays: 0,
      newStartDate: task.startDate,
      newEndDate: task.endDate,
      children,
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
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Droppable droppableId="epics" type={DroppableTypes.EPIC} direction="vertical">
            {({ innerRef, droppableProps, placeholder }) => (
              // eslint-disable-next-line react/jsx-props-no-spreading
              <div {...droppableProps} ref={innerRef}>
                {groups.map((group, gIndex) => (
                  <Draggable key={group.epic.id} draggableId={group.epic.id} index={gIndex}>
                    {({ innerRef: drRef, draggableProps, dragHandleProps }) => (
                      // eslint-disable-next-line react/jsx-props-no-spreading
                      <div ref={drRef} {...draggableProps}>
                        <div
                          {...dragHandleProps}
                          className={styles.epicRow}
                          style={{ height: ROW_HEIGHT }}
                          onDoubleClick={
                            onEpicClick
                              ? () => onEpicClick(group.epic.id.replace('epic-', ''))
                              : undefined
                          }
                        >
                          <Icon
                            name={collapsedEpics[group.epic.id] ? 'chevron right' : 'chevron down'}
                            className={styles.toggleIcon}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEpic(group.epic.id);
                            }}
                          />
                          {group.epic.icon && (
                            <Icon name={group.epic.icon} className={styles.icon} />
                          )}
                          {group.epic.name}
                        </div>
                        {!collapsedEpics[group.epic.id] &&
                          group.children.map((task) => (
                            <div
                              key={task.id}
                              className={styles.cardRow}
                              style={{ height: ROW_HEIGHT }}
                            >
                              {task.name}
                            </div>
                          ))}
                      </div>
                    )}
                  </Draggable>
                ))}
                {placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      <div className={styles.rightColumn} ref={bodyRef} onScroll={handleBodyScroll}>
        <div className={styles.timeline} style={{ width: range.totalDays * DAY_WIDTH }}>
          {visibleItems.map(({ task, index }) => {
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
                    className={task.isChild ? styles.barTask : styles.bar}
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
                      {!task.isChild && task.icon && (
                        <Icon name={task.icon} className={styles.icon} />
                      )}
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
      icon: PropTypes.string,
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
  // eslint-disable-next-line react/require-default-props
  onReorder: PropTypes.func,
};

export default Gantt;
