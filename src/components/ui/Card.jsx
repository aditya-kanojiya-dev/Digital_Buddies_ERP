import React from 'react';

/**
 * Card — glass surface container. `interactive` enables the hover lift used by
 * `.glass-card`; otherwise a static panel.
 */
export default function Card({
  interactive = false,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={`${interactive ? 'glass-card' : 'glass-panel'} rounded-2xl ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
