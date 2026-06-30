import React, { forwardRef } from 'react';

/**
 * Form primitives wrapping the `.glass-input` style with a consistent
 * label + error layout. Field is the labelled wrapper; Input/Textarea/Select
 * are the controls.
 *
 * Tokens are referenced via Tailwind arbitrary values so the controls work
 * in both dark and light themes.
 */

export function Field({ label, error, hint, required, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-xs font-semibold text-[var(--color-text-3)] mb-1.5"
        >
          {label}
          {required && <span className="text-[var(--color-danger-text)] ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[0.7rem] text-[var(--color-danger-text)] mt-1" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-[0.7rem] text-[var(--color-text-muted)] mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

const baseControl =
  'w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[var(--color-text-1)] placeholder:text-[var(--color-text-muted)] disabled:opacity-50';
const errorRing = 'border-[var(--color-danger)]/50 focus:border-[var(--color-danger)]/60';

export const Input = forwardRef(function Input({ error, className = '', ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={`${baseControl} ${error ? errorRing : ''} ${className}`}
      {...rest}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ error, rows = 3, className = '', ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`${baseControl} resize-y ${error ? errorRing : ''} ${className}`}
      {...rest}
    />
  );
});

export const Select = forwardRef(function Select({ error, children, className = '', ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={`${baseControl} appearance-none cursor-pointer ${
        error ? errorRing : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
});
