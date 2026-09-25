import { useNavigate } from "react-router-dom";
import * as authApi from "../../api/auth";
import { NotificationBell } from "../notifications/NotificationBell";
import { Avatar } from "../ui/Avatar";
import { useAuthStore } from "../../store/authStore";

export function TopBar({ title }: { title: string }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    }
    logout();
    navigate("/login");
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-fd-khaki bg-white px-6">
      <h1 className="text-lg font-semibold text-fd-cacao">{title}</h1>
      <div className="flex items-center gap-4">
        <NotificationBell />
        {user && <Avatar name={user.name} size={32} />}
        <button
          onClick={handleLogout}
          className="text-sm text-fd-taupe hover:text-fd-cacao transition-colors duration-150"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
