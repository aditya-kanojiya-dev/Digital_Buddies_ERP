import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button — variant + size wrapper over the `.btn` helper classes.
 *
 * Props:
 *   variant: 'primary' | 'secondary' | 'outline' | 'subtle' | 'ghost' | 'danger'  (default primary)
 *   size:    'sm' | 'md' | 'lg'                                                    (default md)
 *   loading: boolean   — shows spinner, disables interaction
 *   icon:    LucideIcon component (rendered before children)
 *   as:      element/component override (e.g. 'a')
 */
const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-sm',
  xl: 'px-6 py-3.5 text-sm',
};

const ICON_SIZES = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-4 h-4', xl: 'w-4 h-4' };

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  children,
  disabled,
  type = 'button',
  as: Tag = 'button',
  ...rest
}) {
  const iconCls = ICON_SIZES[size] || ICON_SIZES.md;
  return (
    <Tag
      type={Tag === 'button' ? type : undefined}
      disabled={Tag === 'button' ? disabled || loading : undefined}
      className={`btn btn-${variant} ${SIZES[size] || SIZES.md} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className={`${iconCls} animate-spin`} />
      ) : (
        Icon && <Icon className={iconCls} />
      )}
      {children}
    </Tag>
  );
}
