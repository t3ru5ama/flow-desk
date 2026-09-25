import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { client } from "./client";
import { useAuthStore } from "../store/authStore";

// Regression test for a reload-loop bug: AuthBootstrap's silent
// `POST /api/auth/refresh` check (normal for an anonymous visitor) used to
// be treated by this interceptor like any other 401 — it retried via its own
// refresh call, that also 401'd, and the failure handler hard-redirected
// with `window.location.href`, reloading the whole app and re-running
// AuthBootstrap forever. A 401 from the refresh endpoint itself must be
// passed straight through, never retried or redirected on.
function rejectionHandler(error: unknown) {
  const handler = (client.interceptors.response as unknown as { handlers: { rejected: (e: unknown) => unknown }[] })
    .handlers[0].rejected;
  return handler(error);
}

describe("client response interceptor", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, org: null, role: null, isAuthenticated: false });
  });

  it("passes a 401 from the refresh endpoint straight through without retrying or logging out", async () => {
    const postSpy = vi.spyOn(axios, "post");
    const logoutSpy = vi.spyOn(useAuthStore.getState(), "logout");

    const refreshError = {
      config: { url: "/api/auth/refresh", headers: {} },
      response: { status: 401, data: { detail: "No refresh token" } },
    };

    await expect(rejectionHandler(refreshError)).rejects.toBe(refreshError);
    expect(postSpy).not.toHaveBeenCalled();
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it("does not retry a request that has already been retried once", async () => {
    const postSpy = vi.spyOn(axios, "post");

    const alreadyRetried = {
      config: { url: "/api/tasks", headers: {}, _retry: true },
      response: { status: 401, data: {} },
    };

    await expect(rejectionHandler(alreadyRetried)).rejects.toBe(alreadyRetried);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("passes through non-401 errors unchanged", async () => {
    const serverError = {
      config: { url: "/api/tasks", headers: {} },
      response: { status: 500, data: {} },
    };
    await expect(rejectionHandler(serverError)).rejects.toBe(serverError);
  });
});
