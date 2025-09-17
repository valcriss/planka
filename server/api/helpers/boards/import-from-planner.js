/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { POSITION_GAP } = require('../../../constants');

const LOG_TAG = 'boards/import-from-planner';

const BOOLEAN_TRUE_VALUES = new Set([
  'true',
  '1',
  'yes',
  'y',
  'oui',
  'vrai',
  'done',
  'complete',
  'completed',
  'termine',
  'terminee',
  'acheve',
  'achevee',
]);

const BOOLEAN_FALSE_VALUES = new Set([
  'false',
  '0',
  'no',
  'n',
  'non',
  'faux',
  'not done',
  'not completed',
  'incomplete',
  'incomplet',
  'non termine',
  'non terminee',
]);

const PLANNER_COLUMN_INDEXES = {
  TASK_ID: 0,
  TASK_NAME: 1,
  BUCKET_NAME: 2,
  PROGRESS: 3,
  PRIORITY: 4,
  ASSIGNMENTS: 5,
  CREATED_BY: 6,
  CREATED_DATE: 7,
  START_DATE: 8,
  DUE_DATE: 9,
  IS_RECURRING: 10,
  IS_LATE: 11,
  COMPLETED_DATE: 12,
  EXECUTED_BY: 13,
  CHECKLIST_COMPLETED_COUNT: 14,
  CHECKLIST_ITEMS: 15,
  LABELS: 16,
  DESCRIPTION: 17,
};

const stripDiacritics = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  const text = stripDiacritics(String(value))
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .trim();

  return text.replace(/\s+/g, ' ');
};

const slugify = (value) => {
  const base = stripDiacritics(String(value || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return base || 'list';
};

const getUniqueSlug = (name, usedSlugs) => {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 2;

  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  usedSlugs.add(slug);
  return slug;
};

const isEmptyValue = (value) => {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim() === '';
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
};

const getFirstNonEmpty = (object, keys) => {
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key && Object.prototype.hasOwnProperty.call(object, key)) {
      const value = object[key];
      if (!isEmptyValue(value)) {
        return value;
      }
    }
  }

  return null;
};

const getPlannerColumnValues = (row) => {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const { plannerColumnValues } = row;
  if (!Array.isArray(plannerColumnValues)) {
    return null;
  }

  return plannerColumnValues;
};

const getPlannerColumnValue = (row, columnIndex) => {
  if (columnIndex === null || columnIndex === undefined) {
    return null;
  }

  const columnValues = getPlannerColumnValues(row);
  if (!columnValues) {
    return null;
  }

  return columnValues[columnIndex];
};

const getPlannerValue = (row, columnIndex, fallbackKeys = []) => {
  const columnValue = getPlannerColumnValue(row, columnIndex);
  if (!isEmptyValue(columnValue)) {
    return columnValue;
  }

  if (!Array.isArray(fallbackKeys) || fallbackKeys.length === 0) {
    return null;
  }

  return getFirstNonEmpty(row, fallbackKeys);
};

const parseBooleanish = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  if (BOOLEAN_TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (BOOLEAN_FALSE_VALUES.has(normalized)) {
    return false;
  }

  return null;
};

const toArray = (value) => {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => toArray(item))
      .map((item) => (item === null || item === undefined ? '' : String(item).trim()))
      .filter(Boolean);
  }

  return String(value)
    .split(/[;,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const collectNameEntries = (...values) => {
  const entries = [];
  const seen = new Set();

  values.forEach((value) => {
    toArray(value).forEach((item) => {
      const trimmed = item.trim();
      const normalized = normalizeText(trimmed);
      if (!normalized || seen.has(normalized)) {
        return;
      }

      seen.add(normalized);
      entries.push({ original: trimmed, normalized });
    });
  });

  return entries;
};

const parseChecklistCompletedCount = (value) => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  const match = String(value).match(/\d+/);
  if (!match) {
    return 0;
  }

  return Number.parseInt(match[0], 10);
};

const getCompletedDate = (row) =>
  getPlannerValue(row, PLANNER_COLUMN_INDEXES.COMPLETED_DATE, [
    'completedDate',
    'completedAt',
    'actualEndDate',
  ]);

const getStartDate = (row) =>
  getPlannerValue(row, PLANNER_COLUMN_INDEXES.START_DATE, ['startDate', 'actualStartDate']);

const getDueDate = (row) =>
  getPlannerValue(row, PLANNER_COLUMN_INDEXES.DUE_DATE, ['dueDate', 'due']);

const getBucketName = (row, t) => {
  const bucket = getPlannerValue(row, PLANNER_COLUMN_INDEXES.BUCKET_NAME, ['bucketName', 'bucket']);
  const text = bucket === null || bucket === undefined ? '' : String(bucket).trim();

  return text || t('No bucket');
};

const getCardName = (row, t) => {
  const name = getPlannerValue(row, PLANNER_COLUMN_INDEXES.TASK_NAME, [
    'title',
    'name',
    'taskName',
    'nomDeTache',
    'nomDeLaTache',
    'nomTache',
  ]);

  if (!isEmptyValue(name)) {
    return String(name).trim();
  }

  const fallback = getPlannerValue(row, PLANNER_COLUMN_INDEXES.TASK_ID, ['taskId', 'id']);
  if (!isEmptyValue(fallback)) {
    return String(fallback).trim();
  }

  return t('Imported task');
};

const getPlannerDescription = (row) => {
  const description = getPlannerValue(row, PLANNER_COLUMN_INDEXES.DESCRIPTION, [
    'description',
    'notes',
  ]);

  if (isEmptyValue(description)) {
    return null;
  }

  return String(description).trim();
};

module.exports = {
  inputs: {
    board: {
      type: 'ref',
      required: true,
    },
    lists: {
      type: 'ref',
      required: true,
    },
    planner: {
      type: 'json',
      required: true,
    },
    project: {
      type: 'ref',
      required: true,
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn({ board, lists, planner, project, actorUser, request }) {
    const locale = actorUser.language || (request && request.getLocale && request.getLocale());
    const t = sails.helpers.utils.makeTranslator(locale);

    const plannerRows = Array.isArray(planner.rows) ? planner.rows : [];
    if (plannerRows.length === 0) {
      sails.log.debug(`[${LOG_TAG}] No planner rows to import`, {
        boardId: board.id,
        projectId: project.id,
      });
      return;
    }

    sails.log.debug(`[${LOG_TAG}] Starting planner import`, {
      boardId: board.id,
      projectId: project.id,
      rowCount: plannerRows.length,
    });

    let nextCardNumber = 1;
    try {
      const { rows } = await sails.sendNativeQuery(
        `SELECT COALESCE(MAX(card.number), 0) + 1 AS next
         FROM card
         JOIN board ON board.id = card.board_id
         WHERE board.project_id = $1`,
        [project.id],
      );

      const rowsArray = Array.isArray(rows) ? rows : [];
      const nextValueRaw = rowsArray.length > 0 ? rowsArray[0].next : null;
      const parsedNextValue = Number(nextValueRaw);
      const startingNumber =
        Number.isFinite(parsedNextValue) && parsedNextValue > 0 ? parsedNextValue : 1;

      nextCardNumber = startingNumber;

      sails.log.debug(`[${LOG_TAG}] Initialized card numbering`, {
        projectId: project.id,
        nextCardNumber: startingNumber,
      });
    } catch (error) {
      sails.log.error(`[${LOG_TAG}] Failed to initialize card numbering`, {
        projectId: project.id,
        error,
      });
      throw error;
    }

    const getNextCardNumber = () => {
      const number = nextCardNumber;
      nextCardNumber += 1;
      return number;
    };

    const archiveList = lists.find((list) => list.type === List.Types.ARCHIVE) || null;

    const usedListSlugs = new Set(
      lists
        .map((list) => list.slug)
        .filter(Boolean)
        .map((slug) => slug.toLowerCase()),
    );

    const bucketEntries = [];
    const bucketByKey = new Map();

    plannerRows.forEach((row) => {
      const bucketName = getBucketName(row, t);
      const bucketKey = normalizeText(bucketName) || '__bucket__';
      let entry = bucketByKey.get(bucketKey);
      if (!entry) {
        entry = { key: bucketKey, name: bucketName, rows: [] };
        bucketByKey.set(bucketKey, entry);
        bucketEntries.push(entry);
      }

      entry.rows.push(row);
    });

    const listByBucketKey = new Map();
    let listIndex = 0;

    for (let entryIndex = 0; entryIndex < bucketEntries.length; entryIndex += 1) {
      const entry = bucketEntries[entryIndex];
      if (entry.rows.length > 0) {
        const allCompleted = entry.rows.every((row) => Boolean(getCompletedDate(row)));
        const type = allCompleted ? List.Types.CLOSED : List.Types.ACTIVE;
        const slug = getUniqueSlug(entry.name, usedListSlugs);

        // eslint-disable-next-line no-await-in-loop
        const list = await List.qm.createOne({
          boardId: board.id,
          type,
          position: POSITION_GAP * (listIndex + 1),
          name: entry.name,
          slug,
        });

        sails.log.debug(`[${LOG_TAG}] Created list from planner bucket`, {
          boardId: board.id,
          listId: list.id,
          bucketKey: entry.key,
          bucketName: entry.name,
          type,
        });

        listIndex += 1;
        listByBucketKey.set(entry.key, list);
      }
    }

    const importantColor = Label.COLORS.find((color) => color.includes('red')) || Label.COLORS[0];
    const availableLabelColors = Label.COLORS.filter((color) => color !== importantColor);
    let labelColorIndex = 0;
    const labelByNormalizedName = new Map();
    let labelPositionIndex = 0;

    const getNextLabelPosition = () => {
      labelPositionIndex += 1;
      return POSITION_GAP * labelPositionIndex;
    };

    const getNextLabelColor = () => {
      if (availableLabelColors.length === 0) {
        return importantColor;
      }

      const color = availableLabelColors[labelColorIndex % availableLabelColors.length];
      labelColorIndex += 1;
      return color;
    };

    const ensureLabel = async (name, { color } = {}) => {
      if (!name) {
        return null;
      }

      const normalized = normalizeText(name);
      if (!normalized) {
        return null;
      }

      if (labelByNormalizedName.has(normalized)) {
        return labelByNormalizedName.get(normalized);
      }

      const resolvedColor = color || getNextLabelColor();
      const position = getNextLabelPosition();

      const label = await Label.qm.createOne({
        boardId: board.id,
        position,
        name,
        color: resolvedColor,
      });

      labelByNormalizedName.set(normalized, label);
      return label;
    };

    const importantLabel = await ensureLabel(t('Important'), { color: importantColor });

    const labelsToCreate = [];
    plannerRows.forEach((row) => {
      toArray(getPlannerValue(row, PLANNER_COLUMN_INDEXES.LABELS, ['labels'])).forEach(
        (labelName) => {
          const normalized = normalizeText(labelName);
          if (!normalized) {
            return;
          }

          if (labelByNormalizedName.has(normalized)) {
            return;
          }

          if (labelsToCreate.some((item) => item.normalized === normalized)) {
            return;
          }

          labelsToCreate.push({ normalized, name: labelName });
        },
      );
    });

    for (let labelIndex = 0; labelIndex < labelsToCreate.length; labelIndex += 1) {
      const labelEntry = labelsToCreate[labelIndex];
      // eslint-disable-next-line no-await-in-loop
      await ensureLabel(labelEntry.name);
    }

    const users = await User.qm.getAll();
    const userByNormalizedName = new Map();
    users.forEach((user) => {
      const normalized = normalizeText(user.name);
      if (!normalized || userByNormalizedName.has(normalized)) {
        return;
      }

      userByNormalizedName.set(normalized, user);
    });

    const findUserByNormalized = (normalized) => userByNormalizedName.get(normalized) || null;

    const existingBoardMemberships = (await BoardMembership.qm.getByBoardId(board.id)) || [];
    const boardMemberUserIds = new Set(
      existingBoardMemberships.map((membership) => membership.userId),
    );

    const ensureBoardMembership = async (user) => {
      if (!user || boardMemberUserIds.has(user.id)) {
        return;
      }

      await BoardMembership.qm.createOne({
        projectId: project.id,
        boardId: board.id,
        userId: user.id,
        role: BoardMembership.Roles.EDITOR,
      });

      boardMemberUserIds.add(user.id);
    };

    const importDate = new Date().toISOString();
    const cardPositionByListId = new Map();

    const getNextCardPosition = (listId) => {
      const current = cardPositionByListId.get(listId) || 0;
      const next = current + 1;
      cardPositionByListId.set(listId, next);
      return POSITION_GAP * next;
    };

    const recurringLabelName = t('Recurring');
    const lateLabelName = t('Late');

    for (let entryIndex = 0; entryIndex < bucketEntries.length; entryIndex += 1) {
      const entry = bucketEntries[entryIndex];
      const bucketList = listByBucketKey.get(entry.key);

      for (let rowIndex = 0; rowIndex < entry.rows.length; rowIndex += 1) {
        const row = entry.rows[rowIndex];
        const creatorEntries = collectNameEntries(
          getPlannerValue(row, PLANNER_COLUMN_INDEXES.CREATED_BY, ['createdBy', 'creePar']),
          row.createdBy,
          row.creePar,
        );
        const creatorUser = creatorEntries
          .map((entryItem) => findUserByNormalized(entryItem.normalized))
          .find(Boolean);

        const cardName = getCardName(row, t);
        const plannerDescription = getPlannerDescription(row);

        const plannerTaskIdValue = getPlannerValue(row, PLANNER_COLUMN_INDEXES.TASK_ID, [
          'taskId',
          'id',
        ]);
        const plannerTaskId = !isEmptyValue(plannerTaskIdValue)
          ? String(plannerTaskIdValue).trim()
          : null;

        const executedEntries = collectNameEntries(
          getPlannerValue(row, PLANNER_COLUMN_INDEXES.EXECUTED_BY, [
            'executePar',
            'executedBy',
            'completedBy',
          ]),
          row.executePar,
          row.executedBy,
          row.completedBy,
        );

        const completedDate = getCompletedDate(row);
        const startDate = getStartDate(row);
        const dueDate = getDueDate(row);

        const isArchived = parseBooleanish(row.isArchived);
        const isRecurring = parseBooleanish(
          getPlannerValue(row, PLANNER_COLUMN_INDEXES.IS_RECURRING, [
            'estPeriodique',
            'isRecurring',
          ]),
        );
        const isLate = parseBooleanish(
          getPlannerValue(row, PLANNER_COLUMN_INDEXES.IS_LATE, ['enRetard', 'isLate']),
        );

        const targetList = bucketList || archiveList || null;
        const finalList = isArchived && archiveList ? archiveList : targetList;

        if (!finalList) {
          const skipLogContext = {
            boardId: board.id,
            projectId: project.id,
            rowIndex,
            bucketKey: entry.key,
            bucketName: entry.name,
          };

          if (plannerTaskId) {
            skipLogContext.plannerTaskId = plannerTaskId;
          }

          sails.log.warn(`[${LOG_TAG}] Skipping planner row without target list`, skipLogContext);
          // eslint-disable-next-line no-continue
          continue;
        }

        if (creatorUser) {
          // eslint-disable-next-line no-await-in-loop
          await ensureBoardMembership(creatorUser);
        }

        const prevListId = isArchived && archiveList && bucketList ? bucketList.id : null;
        const position = getNextCardPosition(finalList.id);

        const description = plannerDescription || null;

        const cardNumber = getNextCardNumber();

        const cardValues = {
          boardId: board.id,
          listId: finalList.id,
          type: board.defaultCardType || Card.Types.PROJECT,
          position,
          name: cardName,
          description,
          creatorUserId: creatorUser ? creatorUser.id : actorUser.id,
          dueDate: dueDate || null,
          ganttStartDate: startDate || null,
          ganttEndDate: completedDate || null,
          closedAt:
            completedDate ||
            (finalList.type === List.Types.CLOSED || finalList.type === List.Types.ARCHIVE
              ? importDate
              : null),
          listChangedAt: importDate,
          number: cardNumber,
        };

        if (board.defaultCardTypeId) {
          cardValues.cardTypeId = board.defaultCardTypeId;
        }

        if (prevListId) {
          cardValues.prevListId = prevListId;
        }

        const cardLogContext = {
          boardId: board.id,
          projectId: project.id,
          listId: finalList.id,
          cardNumber,
          cardName,
          rowIndex,
          bucketKey: entry.key,
          bucketName: entry.name,
        };

        if (!isEmptyValue(plannerTaskId)) {
          cardLogContext.plannerTaskId = String(plannerTaskId).trim();
        }

        let card;
        try {
          sails.log.debug(`[${LOG_TAG}] Creating card from planner row`, cardLogContext);

          // eslint-disable-next-line no-await-in-loop
          card = await Card.qm.createOne(cardValues);

          sails.log.debug(`[${LOG_TAG}] Created card from planner row`, {
            ...cardLogContext,
            cardId: card.id,
          });
        } catch (error) {
          sails.log.error(`[${LOG_TAG}] Failed to create card from planner row`, {
            ...cardLogContext,
            error,
          });
          throw error;
        }

        const cardMemberUserIds = new Set();
        const ensureCardMembership = async (user) => {
          if (!user || cardMemberUserIds.has(user.id)) {
            return;
          }

          await CardMembership.qm.createOne({
            cardId: card.id,
            userId: user.id,
          });

          cardMemberUserIds.add(user.id);
        };

        const assignmentEntries = collectNameEntries(
          getPlannerValue(row, PLANNER_COLUMN_INDEXES.ASSIGNMENTS, [
            'assignments',
            'attribueA',
            'assignees',
            'assignedTo',
            'responsables',
          ]),
          row.assignments,
          row.attribueA,
          row.assignees,
          row.assignedTo,
          row.responsables,
        );

        for (
          let assignmentIndex = 0;
          assignmentIndex < assignmentEntries.length;
          assignmentIndex += 1
        ) {
          const assignmentEntry = assignmentEntries[assignmentIndex];
          const assignmentUser = findUserByNormalized(assignmentEntry.normalized);
          if (assignmentUser) {
            // eslint-disable-next-line no-await-in-loop
            await ensureBoardMembership(assignmentUser);
            // eslint-disable-next-line no-await-in-loop
            await ensureCardMembership(assignmentUser);
          }
        }

        for (let executedIndex = 0; executedIndex < executedEntries.length; executedIndex += 1) {
          const executedEntry = executedEntries[executedIndex];
          const executedUser = findUserByNormalized(executedEntry.normalized);
          if (executedUser) {
            // eslint-disable-next-line no-await-in-loop
            await ensureBoardMembership(executedUser);
            // eslint-disable-next-line no-await-in-loop
            await ensureCardMembership(executedUser);
          }
        }

        const labelIds = new Set();
        const addUniqueLabel = async (label) => {
          if (!label || labelIds.has(label.id)) {
            return;
          }

          await CardLabel.qm.createOne({
            cardId: card.id,
            labelId: label.id,
          });

          labelIds.add(label.id);
        };

        const priority = getPlannerValue(row, PLANNER_COLUMN_INDEXES.PRIORITY, [
          'priority',
          'importance',
        ]);
        if (!isEmptyValue(priority)) {
          const normalizedPriority = normalizeText(priority);
          if (normalizedPriority.includes('important')) {
            // eslint-disable-next-line no-await-in-loop
            await addUniqueLabel(importantLabel);
          }
        }

        const rowLabelNames = toArray(
          getPlannerValue(row, PLANNER_COLUMN_INDEXES.LABELS, ['labels']),
        );
        for (let labelIndex = 0; labelIndex < rowLabelNames.length; labelIndex += 1) {
          const labelName = rowLabelNames[labelIndex];
          // eslint-disable-next-line no-await-in-loop
          await addUniqueLabel(await ensureLabel(labelName));
        }

        if (isRecurring === true) {
          // eslint-disable-next-line no-await-in-loop
          await addUniqueLabel(await ensureLabel(recurringLabelName));
        }

        if (isLate === true) {
          // eslint-disable-next-line no-await-in-loop
          await addUniqueLabel(await ensureLabel(lateLabelName));
        }

        const checklistItems = toArray(
          getPlannerValue(row, PLANNER_COLUMN_INDEXES.CHECKLIST_ITEMS, [
            'checklistItems',
            'elementsDeLaListeDeControle',
          ]),
        );
        if (checklistItems.length > 0) {
          const completedCount = parseChecklistCompletedCount(
            getPlannerValue(row, PLANNER_COLUMN_INDEXES.CHECKLIST_COMPLETED_COUNT, [
              'elementsDeLaListeDeControleEffectues',
              'checklistItemsChecked',
              'checklistItemsCompleted',
              'checklistCompletedItems',
            ]),
          );

          // eslint-disable-next-line no-await-in-loop
          const taskList = await TaskList.qm.createOne({
            cardId: card.id,
            position: POSITION_GAP,
            name: t('Actions'),
          });

          for (
            let checklistIndex = 0;
            checklistIndex < checklistItems.length;
            checklistIndex += 1
          ) {
            const checklistItem = checklistItems[checklistIndex];
            // eslint-disable-next-line no-await-in-loop
            await Task.qm.createOne({
              taskListId: taskList.id,
              position: POSITION_GAP * (checklistIndex + 1),
              name: checklistItem,
              isCompleted: checklistIndex < completedCount,
            });
          }
        }
      }
    }
  },
};
