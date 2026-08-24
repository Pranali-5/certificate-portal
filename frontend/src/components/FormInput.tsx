export function FormInput({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label className="grid gap-2 text-xs font-bold text-[#52675f] sm:last:col-span-2">
      {label}
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`rounded-xl border px-3.5 py-3 text-sm font-normal outline-none focus:border-(--teal) ${error ? 'border-[#d76e58]' : 'border-(--line)'}`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`rounded-xl border px-3.5 py-3 text-sm font-normal outline-none focus:border-(--teal) ${error ? 'border-[#d76e58]' : 'border-(--line)'}`}
        />
      )}
      {error && <span className="text-xs font-semibold text-[#c55d47]">{error}</span>}
    </label>
  );
}
