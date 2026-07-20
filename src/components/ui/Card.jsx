

const PADDING = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

export default function Card({
  interactive = false,
  padding = 'none',
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={`${interactive ? 'glass-card glass-card-interactive' : 'glass-panel'} rounded-2xl ${PADDING[padding] || ''} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
