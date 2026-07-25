"use client";

import { useEffect, useState } from "react";
import { clinicalDateKeyFromDisplay, formatClinicalDate } from "@/lib/clinical-date";

interface ClinicalDateInputProps {
  name: string;
  value: string;
  onChangeDate: (name: string, value: string) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function ClinicalDateInput({
  name,
  value,
  onChangeDate,
  className,
  disabled,
  required,
}: ClinicalDateInputProps) {
  const [displayValue, setDisplayValue] = useState(formatClinicalDate(value));

  useEffect(() => {
    setDisplayValue(formatClinicalDate(value));
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextDisplayValue = event.target.value;
    setDisplayValue(nextDisplayValue);

    if (!nextDisplayValue.trim()) {
      onChangeDate(name, "");
      return;
    }

    const nextKey = clinicalDateKeyFromDisplay(nextDisplayValue);
    if (nextKey) {
      onChangeDate(name, nextKey);
    }
  };

  const handleBlur = () => {
    const nextKey = clinicalDateKeyFromDisplay(displayValue);
    if (nextKey) {
      setDisplayValue(formatClinicalDate(nextKey));
      onChangeDate(name, nextKey);
      return;
    }

    setDisplayValue(formatClinicalDate(value));
  };

  return (
    <input
      required={required}
      type="text"
      inputMode="numeric"
      name={name}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder="dd/mm/aaaa"
      aria-label="Fecha en formato dd/mm/aaaa"
      className={className}
    />
  );
}
