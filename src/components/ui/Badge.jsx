

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

export default function Badge({ tone = 'slate', dot = false, className = '', children }) {
  return (
    <span className={`badge ${TONES[tone] || TONES.slate} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOTS[tone] || DOTS.slate}`} />}
      {children}
    </span>
  );
}
