import { initials } from "../../lib/format";

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-fd-leather text-white font-medium"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={name}
    >
      {initials(name) || "?"}
    </div>
  );
}
