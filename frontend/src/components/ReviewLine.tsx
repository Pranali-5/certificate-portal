export function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-(--line) pb-3">
      <span className="text-(--ink-muted)">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}
