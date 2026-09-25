import { relativeTime, titleCase } from "../../lib/format";
import type { IncidentEvent, IncidentEventType } from "../../types";

const EVENT_COLOR: Record<IncidentEventType, string> = {
  created: "bg-fd-info",
  status_changed: "bg-fd-leather",
  reassigned: "bg-fd-warning",
  comment_added: "bg-fd-taupe",
  document_attached: "bg-fd-khaki",
  task_linked: "bg-fd-success",
};

export function IncidentTimeline({ events }: { events: IncidentEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-fd-taupe">No events recorded yet.</p>;
  return (
    <ul className="flex flex-col gap-4">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${EVENT_COLOR[e.event_type]}`} />
          <div>
            <p className="text-sm text-fd-cacao">{e.description}</p>
            <p className="text-xs text-fd-taupe">
              {titleCase(e.event_type)} &middot; {relativeTime(e.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
