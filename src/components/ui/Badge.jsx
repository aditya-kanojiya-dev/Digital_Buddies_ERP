

const TONES = {
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
  slate: 'bg-slate-500/15 text-slate-300 border-slate-500/25',
};

const DOTS = {
  violet: 'bg-violet-400',
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
  sky: 'bg-sky-400',
  slate: 'bg-slate-400',
};

const SIZES = {
  sm: 'px-1.5 py-0.5 text-[0.6rem]',
  md: 'px-2 py-0.5 text-[0.65rem]',
  lg: 'px-2.5 py-1 text-xs',
};

export default function Badge({ tone = 'slate', size = 'md', dot = false, pulse = false, className = '', children }) {
  return (
    <span className={`badge ${TONES[tone] || TONES.slate} ${SIZES[size] || SIZES.md} ${className}`}>
      {dot && (
        <span className={`relative flex h-1.5 w-1.5`}>
          {pulse && <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${DOTS[tone] || DOTS.slate}`} />}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${DOTS[tone] || DOTS.slate}`} />
        </span>
      )}
      {children}
    </span>
  );
}
