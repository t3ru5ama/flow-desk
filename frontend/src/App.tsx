import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import * as authApi from "./api/auth";
import * as teamApi from "./api/team";
import { ToastContainer } from "./components/ui/Toast";
import { decodeJwt } from "./lib/jwt";
import { queryClient } from "./lib/queryClient";
import { AppRouter } from "./router";
import { useAuthStore } from "./store/authStore";

function AuthBootstrap() {
  const setSession = useAuthStore((s) => s.setSession);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setBootstrapped = useAuthStore((s) => s.setBootstrapped);

  useEffect(() => {
    (async () => {
      try {
        const { access_token } = await authApi.refresh();
        setAccessToken(access_token);
        const payload = decodeJwt(access_token);
        if (!payload) throw new Error("invalid token");
        const [user, org] = await Promise.all([authApi.getMe(), teamApi.getOrganization(payload.org_id)]);
        setSession(access_token, user, org);
      } catch {
        setBootstrapped();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap />
        <AppRouter />
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
