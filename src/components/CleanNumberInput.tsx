'use client';

import React, { useState, useEffect } from 'react';

interface CleanNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string;
  onChange: (val: number) => void;
  allowEmpty?: boolean;
}

/**
 * Point 9: CleanNumberInput
 * - Disables mouse wheel to prevent accidental changes
 * - Removes spinner arrows
 * - Eliminates stuck leading zero: typing over 0 replaces it cleanly; backspace clears cleanly without snapping back to 0.
 */
export const CleanNumberInput: React.FC<CleanNumberInputProps> = ({
  value,
  onChange,
  allowEmpty = true,
  className = 'form-input',
  min,
  max,
  step,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState<string>(
    value === undefined || value === null || (value === 0 && allowEmpty) ? '' : String(value)
  );

  useEffect(() => {
    if (value === undefined || value === null) {
      setInternalValue('');
    } else {
      const numVal = Number(internalValue);
      // Only sync if different to prevent typing glitches
      if (numVal !== Number(value)) {
        setInternalValue(value === 0 && allowEmpty && internalValue === '' ? '' : String(value));
      }
    }
  }, [value, allowEmpty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // If user typed numbers after a leading 0 (e.g. "05"), strip the leading 0
    if (/^0[0-9]/.test(raw) && !raw.startsWith('0.')) {
      raw = raw.replace(/^0+/, '');
    }

    setInternalValue(raw);

    if (raw === '' || raw === '-') {
      onChange(0);
      return;
    }

    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (internalValue === '' || isNaN(parseFloat(internalValue))) {
      const fallback = min !== undefined ? Number(min) : 0;
      setInternalValue(String(fallback));
      onChange(fallback);
    } else {
      setInternalValue(String(parseFloat(internalValue)));
    }
    if (props.onBlur) props.onBlur(e);
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    // Prevent mouse wheel from silently changing number values
    (e.target as HTMLElement).blur();
  };

  return (
    <input
      type="number"
      value={internalValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onWheel={handleWheel}
      className={className}
      min={min}
      max={max}
      step={step}
      {...props}
    />
  );
};
