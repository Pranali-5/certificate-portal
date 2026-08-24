export function Field({
  label,
  type,
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <label className="grid gap-2 text-xs font-bold text-[#52675f]">
      {label}
      <input
        className={`rounded-xl border bg-white px-3.5 py-3 text-sm font-normal text-foreground outline-none transition placeholder:text-[#abb9b4] focus:border-(--teal) focus:ring-4 focus:ring-[#0e6b5c12] ${error ? 'border-[#d76e58]' : 'border-(--line)'}`}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
      />
      {error && <span className="text-xs font-semibold text-[#c55d47]">{error}</span>}
    </label>
  );
}
