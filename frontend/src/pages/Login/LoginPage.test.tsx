import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import * as authApi from "../../api/auth";

vi.mock("../../api/auth");

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders the login form", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /log in to flowdesk/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("shows an inline error banner on invalid credentials", async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      response: { data: { detail: "Invalid email or password", code: "INVALID_CREDENTIALS" } },
    });
    renderPage();

    await userEvent.type(screen.getByLabelText("Email"), "alex@acme.test");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(screen.getByText("Invalid email or password")).toBeInTheDocument());
  });
});
