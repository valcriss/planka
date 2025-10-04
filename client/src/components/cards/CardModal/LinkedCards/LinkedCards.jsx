/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { dequal } from 'dequal';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Input, Menu } from 'semantic-ui-react';

import entryActions from '../../../../entry-actions';
import selectors from '../../../../selectors';
import { usePrevious } from '../../../../lib/hooks';
import {
  CardLinkCreatableTypes,
  CardLinkTypeTranslationKeys,
  CardLinkTypes,
} from '../../../../constants/Enums';

import LinkedCardItem from './LinkedCardItem';
import styles from './LinkedCards.module.scss';

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_IN_MS = 250;

const LinkedCards = React.memo(({ canEdit = false, className = null, headerClassName }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [searchValue, setSearchValue] = useState('');
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [type, setType] = useState(CardLinkTypes.RELATED);

  const card = useSelector(selectors.selectCurrentCard);
  const board = useSelector(selectors.selectCurrentBoard);

  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);

  const outgoingCardLinks = useSelector(
    (state) => selectors.selectOutgoingCardLinksByCardId(state, card.id),
    shallowEqual,
  );
  const incomingCardLinks = useSelector(
    (state) => selectors.selectIncomingCardLinksByCardId(state, card.id),
    shallowEqual,
  );

  const cardLinks = useMemo(
    () => [...outgoingCardLinks, ...incomingCardLinks],
    [outgoingCardLinks, incomingCardLinks],
  );

  const linkedCardIds = useMemo(
    () => new Set(cardLinks.map((item) => item.linkedCardId)),
    [cardLinks],
  );

  const cardNamesById = useSelector(selectors.selectCardNamesById, shallowEqual);

  const selectSearchData = useMemo(
    () => (state) => {
      const nextSearchState = selectors.selectCardLinkSearchByCardId(state, card.id);
      const cards = (nextSearchState.cardIds || [])
        .map((id) => selectCardById(state, id))
        .filter(Boolean)
        .map((cardItem) => ({
          ...cardItem,
          list: cardItem.listId ? selectListById(state, cardItem.listId) : null,
        }));

      return {
        searchState: nextSearchState,
        searchResults: cards,
      };
    },
    [card.id, selectCardById, selectListById],
  );

  const { searchState, searchResults } = useSelector(selectSearchData, dequal);

  const isCreatePending = useSelector((state) =>
    selectors.selectIsCardLinkCreateInProgressForCardId(state, card.id),
  );

  const deletePendingMap = useSelector(selectors.selectCardLinkDeletePendingMap, shallowEqual);

  const previousIsCreatePending = usePrevious(isCreatePending);

  useEffect(() => {
    if (previousIsCreatePending && !isCreatePending) {
      setSearchValue('');
      setSelectedCardId(null);
    }
  }, [isCreatePending, previousIsCreatePending]);

  useEffect(() => {
    setSearchValue('');
    setSelectedCardId(null);
  }, [card.id]);

  useEffect(() => {
    if (!canEdit) {
      return undefined;
    }

    const trimmedSearch = searchValue.trim();

    if (trimmedSearch.length < MIN_SEARCH_LENGTH) {
      setIsMenuOpen(false);
      return undefined;
    }

    setIsMenuOpen(true);

    const handle = setTimeout(() => {
      dispatch(entryActions.searchCardsForLink(board.id, card.id, trimmedSearch));
    }, SEARCH_DEBOUNCE_IN_MS);

    return () => {
      clearTimeout(handle);
    };
  }, [dispatch, board.id, card.id, searchValue, canEdit]);

  const handleSearchChange = useCallback((event, { value }) => {
    setSearchValue(value);
    setSelectedCardId(null);
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (searchValue.trim().length >= MIN_SEARCH_LENGTH) {
      setIsMenuOpen(true);
    }
  }, [searchValue]);

  const handleSearchBlur = useCallback(() => {
    setTimeout(() => {
      setIsMenuOpen(false);
    }, 100);
  }, []);

  const handleResultSelect = useCallback((cardId, name) => {
    setSelectedCardId(cardId);
    setSearchValue(name);
    setIsMenuOpen(false);
  }, []);

  const handleTypeChange = useCallback((event, { value }) => {
    setType(value);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedCardId || selectedCardId === card.id || isCreatePending) {
      return;
    }

    dispatch(entryActions.createCardLink(card.id, selectedCardId, type));
  }, [dispatch, card.id, selectedCardId, type, isCreatePending]);

  const handleFormSubmit = useCallback(
    (event) => {
      event.preventDefault();
      handleSubmit();
    },
    [handleSubmit],
  );

  const handleRemove = useCallback(
    (cardLinkId) => {
      dispatch(entryActions.deleteCardLink(cardLinkId));
    },
    [dispatch],
  );

  const filteredResults = useMemo(() => {
    if (!canEdit) {
      return [];
    }

    return searchResults.filter(
      (cardItem) => cardItem.id !== card.id && !linkedCardIds.has(cardItem.id),
    );
  }, [searchResults, card.id, linkedCardIds, canEdit]);

  const typeOptions = useMemo(
    () =>
      CardLinkCreatableTypes.map((value) => ({
        key: value,
        value,
        text: t(CardLinkTypeTranslationKeys[value]),
      })),
    [t],
  );

  const isSubmitDisabled =
    !selectedCardId ||
    selectedCardId === card.id ||
    linkedCardIds.has(selectedCardId) ||
    isCreatePending;

  const typeMenuLabel = t('common.type');
  const removeLabel = t('action.remove');
  const searchPlaceholder = t('common.searchCards');
  const noResultsLabel = t('common.noResults');
  const noLinkedCardsLabel = t('common.noLinkedCards');
  const addLinkedCardLabel = t('action.addLinkedCard');
  const linkedCardsTitle = t('common.linkedCards');

  return (
    <div className={classNames(styles.wrapper, className)}>
      <div className={headerClassName}>{linkedCardsTitle}</div>
      {cardLinks.length > 0 ? (
        <div className={styles.list}>
          {cardLinks.map((cardLink) => {
            const cardName = cardNamesById[cardLink.linkedCardId];
            const typeLabel = t(CardLinkTypeTranslationKeys[cardLink.type]);
            const isRemoving = Boolean(deletePendingMap[cardLink.id]);

            return (
              <LinkedCardItem
                key={cardLink.id}
                cardLinkId={cardLink.id}
                linkedCardId={cardLink.linkedCardId}
                name={cardName}
                typeLabel={typeLabel}
                canEdit={canEdit}
                onRemove={handleRemove}
                isRemoving={isRemoving}
                removeLabel={removeLabel}
              />
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>{noLinkedCardsLabel}</div>
      )}
      {canEdit && (
        <form className={styles.form} onSubmit={handleFormSubmit}>
          <div className={styles.formField}>
            <Input
              fluid
              value={searchValue}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              placeholder={searchPlaceholder}
              loading={searchState.isFetching}
            />
            {isMenuOpen && filteredResults.length > 0 && (
              <Menu secondary vertical fluid className={styles.searchMenu}>
                {filteredResults.map((cardItem) => (
                  <Menu.Item
                    key={cardItem.id}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleResultSelect(cardItem.id, cardItem.name);
                    }}
                  >
                    <div className={styles.menuItemPrimary}>{cardItem.name}</div>
                    {cardItem.list && (
                      <div className={styles.menuItemSecondary}>{cardItem.list.name}</div>
                    )}
                  </Menu.Item>
                ))}
              </Menu>
            )}
            {isMenuOpen && !filteredResults.length && !searchState.isFetching && (
              <Menu secondary vertical fluid className={styles.searchMenu}>
                <Menu.Item disabled>{noResultsLabel}</Menu.Item>
              </Menu>
            )}
          </div>
          <Dropdown
            selection
            compact
            options={typeOptions}
            value={type}
            onChange={handleTypeChange}
            aria-label={typeMenuLabel}
            className={styles.typeDropdown}
          />
          <Button
            type="submit"
            positive
            content={addLinkedCardLabel}
            disabled={isSubmitDisabled}
            loading={isCreatePending}
          />
        </form>
      )}
    </div>
  );
});

LinkedCards.propTypes = {
  canEdit: PropTypes.bool, // eslint-disable-line react/require-default-props
  className: PropTypes.string, // eslint-disable-line react/require-default-props
  headerClassName: PropTypes.string.isRequired,
};

export default LinkedCards;
