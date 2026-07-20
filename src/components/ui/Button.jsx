
import { Loader2 } from 'lucide-react';

const SIZES = {
  sm: 'px-3 py-1.5 text-xs min-h-[32px] rounded-lg',
  md: 'px-4 py-2.5 text-sm min-h-[40px] rounded-xl',
  lg: 'px-5 py-3 text-sm min-h-[48px] rounded-xl',
};

const ICON_ONLY_SIZES = {
  sm: 'p-1.5 min-h-[32px] min-w-[32px] rounded-lg',
  md: 'p-2 min-h-[40px] min-w-[40px] rounded-xl',
  lg: 'p-2.5 min-h-[48px] min-w-[48px] rounded-xl',
};

const ICON_SIZES = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-4.5 h-4.5' };

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
  const isIconOnly = Icon && !children;
  const sizeCls = isIconOnly
    ? (ICON_ONLY_SIZES[size] || ICON_ONLY_SIZES.md)
    : (SIZES[size] || SIZES.md);

  return (
    <Tag
      type={Tag === 'button' ? type : undefined}
      disabled={Tag === 'button' ? disabled || loading : undefined}
      className={`btn btn-${variant} ${sizeCls} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className={`${iconCls} animate-spin`} />
      ) : (
        Icon && <Icon className={iconCls} />
      )}
      {children && <span>{children}</span>}
    </Tag>
  );
}
