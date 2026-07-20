export default function LoadingSpinner({ size = 'sm', label, className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} role="status" aria-label={label || 'Loading'}>
      <span className={`spinner ${sizes[size] || sizes.sm}`} />
      {label && <span className="text-xs text-slate-400">{label}</span>}
    </span>
  );
}
