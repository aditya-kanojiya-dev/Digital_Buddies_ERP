import React from 'react';

export function Field({ label, error, hint, required, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-xs font-semibold text-slate-400 mb-1.5"
        >
          {label}
          {required && <span className="text-rose-400 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[0.7rem] text-rose-400 mt-1.5 flex items-center gap-1" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-[0.7rem] text-slate-500 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

const baseControl =
  'w-full glass-input rounded-xl px-3.5 py-2.5 text-sm placeholder:text-slate-600 disabled:opacity-50 min-h-[44px]';
const errorRing = 'border-rose-500/50 focus:border-rose-500/60';

export function Input({ error, className = '', ...rest }) {
  return (
    <input
      className={`${baseControl} ${error ? errorRing : ''} ${className}`}
      {...rest}
    />
  );
}

export function Textarea({ error, rows = 3, className = '', ...rest }) {
  return (
    <textarea
      rows={rows}
      className={`${baseControl} resize-y ${error ? errorRing : ''} ${className}`}
      {...rest}
    />
  );
}

export function Select({ error, children, className = '', ...rest }) {
  return (
    <select
      className={`${baseControl} appearance-none cursor-pointer ${
        error ? errorRing : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}
