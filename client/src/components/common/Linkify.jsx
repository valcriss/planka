/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Icon } from 'semantic-ui-react';
import LinkifyReact from 'linkify-react';

import { CardTypeIcons } from '../../constants/Icons';

import history from '../../history';
import selectors from '../../selectors';

const Linkify = React.memo(({ children, linkStopPropagation, ...props }) => {
  const cardNamesById = useSelector(selectors.selectCardNamesById);
  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);

  const handleLinkClick = useCallback(
    (event) => {
      if (linkStopPropagation) {
        event.stopPropagation();
      }

      if (!event.target.getAttribute('target')) {
        event.preventDefault();
        history.push(event.target.href);
      }
    },
    [linkStopPropagation],
  );

  // eslint-disable-next-line react/no-unstable-nested-components,react/prop-types
  const CardLink = React.memo(({ id, href, content, ...linkProps }) => {
    const card = useSelector((state) => selectCardById(state, id));
    const cardType = useSelector((state) => {
      if (!card || !card.cardTypeId) {
        return null;
      }

      return (
        selectors.selectCardTypeById(state, card.cardTypeId) ||
        selectors.selectBaseCardTypeById(state, card.cardTypeId)
      );
    });

    const iconName = (cardType && cardType.icon) || (card && CardTypeIcons[card.type]);

    return (
      <a
        {...linkProps} // eslint-disable-line react/jsx-props-no-spreading
        href={href}
        onClick={handleLinkClick}
      >
        {iconName && (
          <Icon
            name={iconName}
            style={
              cardType && cardType.color
                ? { color: cardType.color, marginRight: 4 }
                : { marginRight: 4 }
            }
          />
        )}
        {content}
      </a>
    );
  });

  const linkRenderer = useCallback(
    ({ attributes: { href, ...linkProps }, content }) => {
      let url;
      try {
        url = new URL(href, window.location);
      } catch {
        /* empty */
      }

      const isSameSite = !!url && url.origin === window.location.origin;
      if (isSameSite) {
        const { pathname } = url;
        const match = pathname.match(/^\/cards\/([^/]+)$/);
        if (match) {
          return (
            <CardLink
              {...linkProps} // eslint-disable-line react/jsx-props-no-spreading
              id={match[1]}
              href={href}
              content={cardNamesById[match[1]] || pathname}
            />
          );
        }

        return (
          <a
            {...linkProps} // eslint-disable-line react/jsx-props-no-spreading
            href={href}
            onClick={handleLinkClick}
          >
            {cardNamesById[match?.[1]] || pathname}
          </a>
        );
      }

      return (
        <a
          {...linkProps} // eslint-disable-line react/jsx-props-no-spreading
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={handleLinkClick}
        >
          {content}
        </a>
      );
    },
    [handleLinkClick, cardNamesById],
  );

  return (
    <LinkifyReact
      {...props} // eslint-disable-line react/jsx-props-no-spreading
      options={{
        defaultProtocol: 'https',
        render: linkRenderer,
      }}
    >
      {children}
    </LinkifyReact>
  );
});

Linkify.propTypes = {
  children: PropTypes.string.isRequired,
  linkStopPropagation: PropTypes.bool,
};

Linkify.defaultProps = {
  linkStopPropagation: false,
};

export default Linkify;
