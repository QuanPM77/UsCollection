"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { VIETNAM_ADDRESSES } from "@/lib/vietnam-addresses";

export type AddressParts = { street: string; province: string; ward: string };

function splitSavedAddress(addressLine: string, province: string): AddressParts {
  const entry = VIETNAM_ADDRESSES.find((item) => item.province === province);
  if (entry) {
    const ward = [...entry.wards].sort((a, b) => b.length - a.length).find((item) => addressLine.endsWith(`, ${item}`));
    if (ward) return { street: addressLine.slice(0, -(ward.length + 2)).trim(), province, ward };
  }
  return { street: addressLine, province, ward: "" };
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("vi").trim();
}

function SearchablePicker({
  id,
  value,
  options,
  placeholder,
  disabled,
  onChange,
  className,
  formId,
}: {
  id: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  className: string;
  formId?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || value) setQuery(value);
  }, [open, value]);
  const filtered = useMemo(() => {
    const search = normalize(query);
    return search ? options.filter((item) => normalize(item).includes(search)) : options;
  }, [options, query]);

  return (
    <div className="relative">
      <input
        id={id}
        form={formId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        autoComplete="off"
        required
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        className={`${className} pr-11`}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange("");
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown") setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? "Đóng danh sách" : "Mở danh sách"}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((current) => !current)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-pink-text/60 disabled:opacity-40"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.09 1.032l-4.25 4.51a.75.75 0 01-1.09 0l-4.25-4.51a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
      </button>
      {open && !disabled && (
        <ul id={`${id}-options`} role="listbox" className="absolute left-0 right-0 top-full z-[70] mt-1 max-h-56 overflow-y-auto overscroll-contain rounded-xl border border-pink-mid/40 bg-white p-1 shadow-xl">
          {filtered.length ? filtered.map((option) => (
            <li key={option} role="option" aria-selected={value === option}>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setQuery(option); onChange(option); setOpen(false); }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-pink-text hover:bg-pink-light focus:bg-pink-light focus:outline-none">{option}</button>
            </li>
          )) : <li className="px-3 py-2.5 text-sm text-pink-text/50">Không tìm thấy kết quả</li>}
        </ul>
      )}
    </div>
  );
}

export default function AddressFields({
  idPrefix,
  streetName,
  provinceName,
  wardName,
  initialAddressLine = "",
  initialProvince = "",
  formId,
  inputClass,
  labelClass,
  onValueChange,
}: {
  idPrefix: string;
  streetName: string;
  provinceName: string;
  wardName: string;
  initialAddressLine?: string;
  initialProvince?: string;
  formId?: string;
  inputClass: string;
  labelClass: string;
  onValueChange?: (value: AddressParts) => void;
}) {
  const initial = useMemo(() => splitSavedAddress(initialAddressLine, initialProvince), [initialAddressLine, initialProvince]);
  const [parts, setParts] = useState<AddressParts>(initial);
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;
  useEffect(() => setParts(initial), [initial]);
  useEffect(() => onValueChangeRef.current?.(initial), [initial]);
  const provinceOptions = useMemo(() => VIETNAM_ADDRESSES.map((entry) => entry.province), []);
  const wardOptions = useMemo(() => VIETNAM_ADDRESSES.find((entry) => entry.province === parts.province)?.wards ?? [], [parts.province]);

  function update(next: AddressParts) {
    setParts(next);
    onValueChangeRef.current?.(next);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-street`}>Số nhà, tên đường, khu phố *</label>
        <input form={formId} id={`${idPrefix}-street`} name={streetName} required minLength={3} autoComplete="street-address" value={parts.street} onChange={(event) => update({ ...parts, street: event.target.value })} placeholder="Ví dụ: 12 Nguyễn Huệ, khu phố 3" className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-province`}>Tỉnh / thành phố *</label>
        <SearchablePicker id={`${idPrefix}-province`} formId={formId} value={parts.province} options={provinceOptions} placeholder="Tìm tỉnh / thành phố" className={inputClass} onChange={(province) => update({ ...parts, province, ward: "" })} />
        <input form={formId} type="hidden" name={provinceName} value={parts.province} />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-ward`}>Phường / xã *</label>
        <SearchablePicker id={`${idPrefix}-ward`} formId={formId} value={parts.ward} options={wardOptions} placeholder={parts.province ? "Tìm phường / xã" : "Chọn tỉnh / thành phố trước"} className={inputClass} disabled={!parts.province} onChange={(ward) => update({ ...parts, ward })} />
        <input form={formId} type="hidden" name={wardName} value={parts.ward} />
      </div>
    </div>
  );
}
