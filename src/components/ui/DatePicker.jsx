import React, { forwardRef } from 'react';
import ReactDatePicker from 'react-datepicker';
import { Calendar } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import './datepicker.css';

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const CustomInput = forwardRef(({ value, onClick, placeholder, required, className }, ref) => (
  <button
    type="button"
    onClick={onClick}
    ref={ref}
    className={`w-full glass-input p-2.5 rounded-xl text-sm text-left flex items-center gap-2 ${className || ''}`}
  >
    <Calendar className="w-4 h-4 text-violet-400 flex-shrink-0" />
    <span className={value ? 'text-slate-200' : 'text-slate-500'}>
      {value || placeholder || 'Select date'}
    </span>
    {required && <span className="text-rose-400 ml-auto">*</span>}
  </button>
));

CustomInput.displayName = 'CustomInput';

export default function DatePicker({
  value,
  onChange,
  label,
  required,
  placeholderText = 'Select date',
  className = '',
  minDate,
  maxDate,
  disabled,
}) {
  const selected = parseDate(value);

  const handleChange = (date) => {
    onChange?.(date ? formatDate(date) : '');
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs text-slate-400 mb-1">
          {label}
          {required && <span className="text-rose-400 ml-0.5">*</span>}
        </label>
      )}
      <ReactDatePicker
        selected={selected}
        onChange={handleChange}
        dateFormat="yyyy-MM-dd"
        placeholderText={placeholderText}
        customInput={<CustomInput required={required} />}
        minDate={minDate ? parseDate(minDate) : undefined}
        maxDate={maxDate ? parseDate(maxDate) : undefined}
        disabled={disabled}
        popperClassName="glass-datepicker-popper"
        calendarClassName="glass-datepicker-calendar"
        wrapperClassName="w-full"
        popperPlacement="bottom-start"
        showPopperArrow={false}
        isClearable={!!value}
      />
    </div>
  );
}
