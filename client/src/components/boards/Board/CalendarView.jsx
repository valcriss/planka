/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { Icon, Button, Popup as SUIPopup } from 'semantic-ui-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import entryActions from '../../../entry-actions';
import selectors from '../../../selectors';
import Card from '../../cards/Card';

import styles from './CalendarView.module.scss';

// Génère un tableau de semaines (chacune: array de 7 objets { date: Date, key: 'YYYY-MM-DD' })
function buildMonthMatrix(anchorDate) {
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const startDay = firstOfMonth.getUTCDay(); // 0 (dim) - 6 (sam)
  // On veut commencer la grille le lundi => calcul offset
  const offset = (startDay + 6) % 7; // transforme: lun=0 ... dim=6
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(firstOfMonth.getUTCDate() - offset);

  const weeks = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w += 1) {
    const week = [];
    for (let d = 0; d < 7; d += 1) {
      const key = cursor.toISOString().slice(0, 10);
      week.push({ date: new Date(cursor), key });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
    // Arrêt anticipé si la semaine contient le dernier jour du mois et qu'on est déjà revenu au lundi suivant
    if (weeks.length >= 5) {
      const hasNextMonthDaysOnly = week.every((cell) => cell.date.getUTCMonth() !== month);
      if (hasNextMonthDaysOnly) break; // on supprime la dernière semaine vide du mois
    }
  }
  return weeks;
}

const CalendarView = React.memo(({ cardIds }) => {
  const [t] = useTranslation();
  const todayKey = new Date().toISOString().slice(0, 10);
  const dispatch = useDispatch();
  const [anchorDate, setAnchorDate] = useState(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
  });

  const rawGrouped = useSelector(selectors.selectFilteredCardsGroupedByDueDayForCurrentBoard);
  const grouped = useMemo(() => rawGrouped || {}, [rawGrouped]);
  const cardNamesById = useSelector(selectors.selectCardNamesById);

  const monthMatrix = useMemo(() => buildMonthMatrix(anchorDate), [anchorDate]);
  const monthLabel = useMemo(() => {
    // Utilise locale navigateur pour un label lisible
    return anchorDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [anchorDate]);

  const handlePrev = useCallback(() => {
    setAnchorDate((prev) => new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() - 1, 1)));
  }, []);
  const handleNext = useCallback(() => {
    setAnchorDate((prev) => new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 1)));
  }, []);
  const handleToday = useCallback(() => {
    const d = new Date();
    setAnchorDate(new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)));
  }, []);

  const [dragOverDayKey, setDragOverDayKey] = useState(null);

  const handleDragStart = useCallback((start) => {
    setDragOverDayKey(start.source.droppableId);
  }, []);

  const handleDragUpdate = useCallback((update) => {
    if (update.destination) {
      setDragOverDayKey(update.destination.droppableId);
    }
  }, []);

  // Construire une map id -> {hours, minutes, seconds, ms} pour les cartes avec dueDate afin de préserver l'heure.
  const cardTimeMap = useSelector((state) => {
    const map = {};
    // Récupère toutes les cartes filtrées du board courant
    const filteredIds = selectors.selectFilteredCardIdsForCurrentBoard(state) || [];
    filteredIds.forEach((cid) => {
      const card = selectors.selectCardById(state, cid);
      if (card && card.dueDate instanceof Date) {
        map[cid] = {
          h: card.dueDate.getHours(),
          m: card.dueDate.getMinutes(),
          s: card.dueDate.getSeconds(),
          ms: card.dueDate.getMilliseconds(),
        };
      }
    });
    return map;
  });

  const handleDragEnd = useCallback(
    (result) => {
      const { destination, source, draggableId } = result;
      setDragOverDayKey(null);
      if (!destination) return; // dropped outside a droppable
      const targetDayKey = destination.droppableId;
      const sourceDayKey = source.droppableId;
      if (targetDayKey === sourceDayKey) return; // no day change

      // Récupère l'heure existante si présente dans la map, sinon défaut midi
      const time = cardTimeMap[draggableId];
      const hours = time ? time.h : 12;
      const minutes = time ? time.m : 0;
      const seconds = time ? time.s : 0;
      const ms = time ? time.ms : 0;

      const newDue = new Date(`${targetDayKey}T00:00:00.000Z`);
      newDue.setHours(hours, minutes, seconds, ms); // conserver heure locale utilisateur
      dispatch(entryActions.updateCard(draggableId, { dueDate: newDue }));
    },
    [dispatch, cardTimeMap],
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.left}>
          <Button icon size="mini" onClick={handlePrev} aria-label={t('action.calendarPrevious')}>
            <Icon name="chevron left" />
          </Button>
          <Button icon size="mini" onClick={handleToday} aria-label={t('action.calendarToday')}>
            <Icon name="dot circle" />
          </Button>
          <Button icon size="mini" onClick={handleNext} aria-label={t('action.calendarNext')}>
            <Icon name="chevron right" />
          </Button>
        </div>
        <h3 className={styles.monthLabel}>{monthLabel}</h3>
        <div />
      </div>
      <DragDropContext
        onDragStart={handleDragStart}
        onDragUpdate={handleDragUpdate}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.grid}>
          {/* En-têtes jours (traduits) */}
          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d, index) => {
            const isWeekend = index >= 5; // 5: samedi, 6: dimanche
            const isHighlightedColumn =
              dragOverDayKey &&
              monthMatrix.some((week) => week[index] && week[index].key === dragOverDayKey);
            return (
              <div
                key={d}
                className={[
                  styles.dayHeader,
                  isWeekend && styles.dayHeaderWeekend,
                  isHighlightedColumn && styles.dayHeaderHighlight,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {t(`common.weekdayShort.${d}`)}
              </div>
            );
          })}
          {monthMatrix.map((week) =>
            week.map((cell) => {
              const isToday = cell.key === todayKey;
              const isOtherMonth = cell.date.getUTCMonth() !== anchorDate.getUTCMonth();
              const weekdayIndex = (cell.date.getUTCDay() + 6) % 7; // lun=0 ... dim=6
              const isWeekend = weekdayIndex >= 5;
              const isHighlighted = dragOverDayKey === cell.key;
              const dayCards = grouped[cell.key] || [];
              return (
                <Droppable droppableId={cell.key} key={cell.key} type="CARD">
                  {({ innerRef, droppableProps, placeholder }) => (
                    <div
                      // eslint-disable-next-line react/jsx-props-no-spreading
                      {...droppableProps}
                      ref={innerRef}
                      className={[
                        styles.cell,
                        isToday && styles.today,
                        isOtherMonth && styles.otherMonth,
                        dayCards.length > 0 && styles.hasCards,
                        isWeekend && styles.weekend,
                        isHighlighted && styles.dragHighlight,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className={styles.date}>{cell.date.getUTCDate()}</div>
                      <div className={styles.cards}>
                        {dayCards.map((id, index) => (
                          <Draggable draggableId={id} index={index} key={id}>
                            {({ innerRef: drRef, draggableProps, dragHandleProps }) => {
                              const title = cardNamesById[id] || '';
                              return (
                                <SUIPopup
                                  basic
                                  position="top center"
                                  mouseEnterDelay={300}
                                  mouseLeaveDelay={100}
                                  className={styles.titlePopupInner}
                                  content={<div className={styles.titlePopupContent}>{title}</div>}
                                  trigger={
                                    <div
                                      ref={drRef}
                                      // eslint-disable-next-line react/jsx-props-no-spreading
                                      {...draggableProps}
                                      // eslint-disable-next-line react/jsx-props-no-spreading
                                      {...dragHandleProps}
                                      className={styles.cardWrapper}
                                    >
                                      <Card id={id} isInline />
                                    </div>
                                  }
                                />
                              );
                            }}
                          </Draggable>
                        ))}
                        {placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            }),
          )}
        </div>
      </DragDropContext>
      {cardIds.length === 0 && (
        <div className={styles.empty}>{t('common.noCards', 'No cards')}</div>
      )}
    </div>
  );
});

CalendarView.propTypes = {
  cardIds: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default CalendarView;
