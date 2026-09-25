import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as integrationsApi from "../../api/integrations";
import { AppShell } from "../../components/layout/AppShell";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { roleAtLeast } from "../../lib/constants";
import { titleCase } from "../../lib/format";
import { useAuthStore } from "../../store/authStore";

const PROVIDER_LABELS: Record<string, string> = {
  github: "GitHub",
  slack: "Slack",
  google_drive: "Google Drive",
  jira: "Jira",
  pagerduty: "PagerDuty",
};

export function IntegrationsPage() {
  const role = useAuthStore((s) => s.role);
  const canManage = roleAtLeast(role, "admin");
  const queryClient = useQueryClient();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["integrations"],
    queryFn: integrationsApi.listIntegrations,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ provider, connected }: { provider: string; connected: boolean }) =>
      integrationsApi.updateIntegration(provider as never, { connected }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

  if (isPending) return <AppShell title="Integrations"><LoadingState rows={4} /></AppShell>;
  if (isError) return <AppShell title="Integrations"><ErrorState message="Couldn't load integrations." onRetry={refetch} /></AppShell>;

  return (
    <AppShell title="Integrations">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((integration) => (
          <Card key={integration.provider}>
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-fd-cacao">{PROVIDER_LABELS[integration.provider] ?? titleCase(integration.provider)}</h3>
              <Badge variant={integration.connected ? "success" : "default"}>
                {integration.connected ? "Connected" : "Not connected"}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-fd-taupe">
              Sync activity and notifications with {PROVIDER_LABELS[integration.provider] ?? integration.provider}.
            </p>
            {canManage && (
              <Button
                variant={integration.connected ? "secondary" : "primary"}
                className="mt-4 w-full"
                onClick={() => toggleMutation.mutate({ provider: integration.provider, connected: !integration.connected })}
              >
                {integration.connected ? "Disconnect" : "Connect"}
              </Button>
            )}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
