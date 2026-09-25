import { NavLink } from "react-router-dom";
import { roleAtLeast } from "../../lib/constants";
import { useAuthStore } from "../../store/authStore";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/projects", label: "Projects" },
  { to: "/tasks", label: "Tasks" },
  { to: "/incidents", label: "Incidents" },
  { to: "/approvals", label: "Approvals" },
  { to: "/documents", label: "Documents" },
  { to: "/notifications", label: "Notifications" },
  { to: "/team", label: "Team" },
  { to: "/integrations", label: "Integrations" },
  { to: "/billing", label: "Billing", minRole: "admin" as const },
  { to: "/settings", label: "Settings" },
];

export function Sidebar() {
  const role = useAuthStore((s) => s.role);
  const org = useAuthStore((s) => s.org);
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col bg-fd-leather text-white">
      <div className="px-5 py-5 text-lg font-semibold">FlowDesk</div>
      <div className="px-5 pb-4 text-xs text-white/50 truncate">{org?.name}</div>
      <nav className="flex-1 overflow-y-auto px-2">
        {NAV.filter((item) => !item.minRole || roleAtLeast(role, item.minRole)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `mb-1 block rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
                isActive ? "bg-fd-leather-hover text-white" : "text-white/70 hover:bg-fd-leather-hover hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-2">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `block rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
              isActive ? "bg-fd-leather-hover text-white" : "text-white/70 hover:bg-fd-leather-hover hover:text-white"
            }`
          }
        >
          Profile
        </NavLink>
      </div>
    </aside>
  );
}
