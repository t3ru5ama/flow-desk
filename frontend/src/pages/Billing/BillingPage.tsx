import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as billingApi from "../../api/billing";
import { AppShell } from "../../components/layout/AppShell";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { roleAtLeast } from "../../lib/constants";
import { titleCase } from "../../lib/format";
import { useAuthStore } from "../../store/authStore";
import type { Plan } from "../../types";

const PLANS: { plan: Plan; users: string; projects: string; price: string }[] = [
  { plan: "free", users: "5", projects: "3", price: "$0" },
  { plan: "starter", users: "20", projects: "15", price: "$29/mo" },
  { plan: "business", users: "100", projects: "100", price: "$99/mo" },
  { plan: "enterprise", users: "Unlimited", projects: "Unlimited", price: "Contact us" },
];

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-fd-cacao">{label}</span>
        <span className="text-fd-taupe">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-fd-khaki">
        <div className="h-2 rounded-full bg-fd-leather" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BillingPage() {
  const role = useAuthStore((s) => s.role);
  const canManage = roleAtLeast(role, "admin");
  const queryClient = useQueryClient();

  const subscription = useQuery({ queryKey: ["billing", "subscription"], queryFn: billingApi.getSubscription });
  const usage = useQuery({ queryKey: ["billing", "usage"], queryFn: billingApi.getUsage });

  const updateMutation = useMutation({
    mutationFn: billingApi.updateSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });

  if (subscription.isPending || usage.isPending) return <AppShell title="Billing"><LoadingState rows={5} /></AppShell>;
  if (subscription.isError || usage.isError || !subscription.data || !usage.data)
    return <AppShell title="Billing"><ErrorState message="Couldn't load billing info." /></AppShell>;

  return (
    <AppShell title="Billing">
      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fd-cacao">Current plan</h3>
            <Badge variant="info">{titleCase(subscription.data.plan)}</Badge>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <UsageBar label="Users" used={usage.data.users_used} limit={usage.data.user_limit} />
            <UsageBar label="Projects" used={usage.data.projects_used} limit={usage.data.project_limit} />
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <Card key={p.plan} className={p.plan === subscription.data.plan ? "border-fd-leather" : ""}>
              <h3 className="font-medium text-fd-cacao">{titleCase(p.plan)}</h3>
              <p className="mt-1 text-xl font-semibold text-fd-cacao">{p.price}</p>
              <ul className="mt-3 flex flex-col gap-1 text-sm text-fd-taupe">
                <li>{p.users} users</li>
                <li>{p.projects} projects</li>
              </ul>
              {canManage && p.plan !== subscription.data.plan && (
                <Button variant="secondary" className="mt-4 w-full" onClick={() => updateMutation.mutate(p.plan)}>
                  Switch to {titleCase(p.plan)}
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
