import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskFormModal } from "./TaskFormModal";
import { useAuthStore } from "../../store/authStore";

vi.mock("../../api/tasks", () => ({ createTask: vi.fn(), updateTask: vi.fn() }));
vi.mock("../../api/projects", () => ({ listProjects: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 }) }));
vi.mock("../../api/team", () => ({ listMembers: vi.fn().mockResolvedValue([]) }));

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TaskFormModal onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe("TaskFormModal", () => {
  beforeEach(() => {
    useAuthStore.setState({ org: { id: "org1", name: "Acme" } });
  });

  it("requires a title before it can be submitted", () => {
    renderModal();
    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    expect(titleInput).toBeRequired();
  });

  it("lets the user type a title", () => {
    renderModal();
    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "New task" } });
    expect(titleInput.value).toBe("New task");
  });
});
