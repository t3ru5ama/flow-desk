import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskTable } from "./TaskTable";
import type { Task } from "../../types";

const tasks: Task[] = [
  {
    id: "t1",
    project_id: null,
    title: "Fix login bug",
    description: null,
    status: "todo",
    priority: "high",
    assignee_id: null,
    reporter_id: "u1",
    due_date: null,
    labels: [{ id: "l1", name: "bug", color: "#A3453A" }],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("TaskTable", () => {
  it("renders task rows with title and labels", () => {
    render(<TaskTable tasks={tasks} onRowClick={vi.fn()} onStatusChange={vi.fn()} />);
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    expect(screen.getByText("bug")).toBeInTheDocument();
  });

  it("calls onStatusChange when the status select changes", () => {
    const onStatusChange = vi.fn();
    render(<TaskTable tasks={tasks} onRowClick={vi.fn()} onStatusChange={onStatusChange} />);
    fireEvent.change(screen.getByDisplayValue("Todo"), { target: { value: "done" } });
    expect(onStatusChange).toHaveBeenCalledWith("t1", "done");
  });

  it("calls onRowClick when the title is clicked", () => {
    const onRowClick = vi.fn();
    render(<TaskTable tasks={tasks} onRowClick={onRowClick} onStatusChange={vi.fn()} />);
    fireEvent.click(screen.getByText("Fix login bug"));
    expect(onRowClick).toHaveBeenCalledWith("t1");
  });
});
