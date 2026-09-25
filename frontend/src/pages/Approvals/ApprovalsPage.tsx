import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import * as approvalsApi from "../../api/approvals";
import { ApprovalCreateModal } from "../../components/approvals/ApprovalCreateModal";
import { ApprovalDetailModal } from "../../components/approvals/ApprovalDetailModal";
import { ApprovalStepper } from "../../components/approvals/ApprovalStepper";
import { AppShell } from "../../components/layout/AppShell";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Tabs } from "../../components/ui/Tabs";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/States";
import { roleAtLeast } from "../../lib/constants";
import { titleCase } from "../../lib/format";
import { useAuthStore } from "../../store/authStore";

const STATUS_BADGE = { pending: "warning", approved: "success", rejected: "error" } as const;

export function ApprovalsPage() {
  const [tab, setTab] = useState<"mine" | "requested" | "all">("mine");
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const role = useAuthStore((s) => s.role);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["approvals", tab],
    queryFn: () => approvalsApi.listApprovals({ filter: tab }),
  });

  return (
    <AppShell title="Approvals">
      <div className="mb-4 flex items-center justify-between">
        <Tabs
          tabs={[
            { key: "mine", label: "Awaiting my approval" },
            { key: "requested", label: "My requests" },
            { key: "all", label: "All" },
          ]}
          active={tab}
          onChange={setTab}
        />
        {roleAtLeast(role, "manager") && <Button onClick={() => setShowForm(true)}>New request</Button>}
      </div>

      {isPending ? (
        <LoadingState rows={5} />
      ) : isError ? (
        <ErrorState message="Couldn't load approvals." onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <EmptyState title="Nothing here" />
      ) : (
        <div className="flex flex-col gap-2">
          {data.items.map((a) => (
            <button
              key={a.id}
              onClick={() => setOpenId(a.id)}
              className="flex items-center justify-between rounded-lg border border-fd-khaki bg-white p-4 text-left transition-colors duration-150 hover:border-fd-taupe"
            >
              <div>
                <p className="text-sm font-medium text-fd-cacao">{a.title}</p>
                <Badge variant={STATUS_BADGE[a.status]}>{titleCase(a.status)}</Badge>
              </div>
              <ApprovalStepper steps={a.steps} currentStepOrder={a.current_step_order} compact />
            </button>
          ))}
        </div>
      )}

      {showForm && <ApprovalCreateModal onClose={() => setShowForm(false)} />}
      {openId && <ApprovalDetailModal approvalId={openId} onClose={() => setOpenId(null)} />}
    </AppShell>
  );
}
