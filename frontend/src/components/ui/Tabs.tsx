export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-fd-khaki">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px ${
            active === t.key
              ? "border-fd-leather text-fd-cacao"
              : "border-transparent text-fd-taupe hover:text-fd-cacao"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
