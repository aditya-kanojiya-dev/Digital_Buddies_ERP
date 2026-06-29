import React from 'react';

/**
 * Skeleton — shimmer placeholder for loading states.
 * Use `lines` for a stacked text block, or pass className for a single shape.
 */
export default function Skeleton({ className = 'h-4 w-full', lines = 1, rounded = 'rounded-lg' }) {
  const base = {
    background:
      'linear-gradient(90deg, rgba(139,92,246,0.06) 25%, rgba(139,92,246,0.16) 37%, rgba(139,92,246,0.06) 63%)',
    backgroundSize: '936px 100%',
    animation: 'shimmer 1.4s ease infinite',
  };

  if (lines > 1) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={base}
            className={`${rounded} h-3.5 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
          />
        ))}
      </div>
    );
  }

  return <div style={base} className={`${rounded} ${className}`} />;
}

/** A grid of card-shaped skeletons for dashboard loading states. */
export function SkeletonCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-5">
          <Skeleton className="h-10 w-10 mb-4" rounded="rounded-xl" />
          <Skeleton lines={2} />
        </div>
      ))}
    </div>
  );
}
