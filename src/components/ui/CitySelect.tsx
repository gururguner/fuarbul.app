import type { ReactNode, SelectHTMLAttributes } from "react";

import { normalizeTurkeyCity, turkeyCities } from "@/lib/turkey-cities";
import { cn } from "@/lib/utils";

type CitySelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  helperText?: ReactNode;
  label?: ReactNode;
  placeholder: string;
  showLegacyValue?: boolean;
};

export function CitySelect({
  className,
  defaultValue,
  helperText,
  label,
  placeholder,
  showLegacyValue = false,
  ...props
}: CitySelectProps) {
  const normalizedCity =
    typeof defaultValue === "string" ? normalizeTurkeyCity(defaultValue) : null;
  const normalizedDefaultValue =
    typeof defaultValue === "string" ? normalizedCity ?? "" : defaultValue;
  const legacyValue =
    showLegacyValue && typeof defaultValue === "string" && defaultValue && !normalizedCity
      ? defaultValue
      : "";

  return (
    <label className="block space-y-2">
      {label ? (
        <span className="text-sm font-medium text-slate-700">{label}</span>
      ) : null}
      <select
        className={cn(
          "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-200",
          className,
        )}
        defaultValue={normalizedDefaultValue}
        {...props}
      >
        <option disabled value="">
          {placeholder}
        </option>
        {legacyValue ? <option value={legacyValue}>{legacyValue}</option> : null}
        {turkeyCities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
      {helperText ? (
        <span className="block text-xs leading-5 text-slate-500">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}
