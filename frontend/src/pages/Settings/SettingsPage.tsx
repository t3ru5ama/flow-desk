import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as teamApi from "../../api/team";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { roleAtLeast } from "../../lib/constants";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";

export function SettingsPage() {
  const org = useAuthStore((s) => s.org);
  const role = useAuthStore((s) => s.role);
  const canEdit = roleAtLeast(role, "admin");
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);
  const [name, setName] = useState("");

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["organization", org?.id],
    queryFn: () => teamApi.getOrganization(org!.id),
    enabled: !!org,
  });

  const mutation = useMutation({
    mutationFn: (value: string) => teamApi.updateOrganization(org!.id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", org?.id] });
      addToast("Organization updated");
    },
  });

  if (isPending) return <AppShell title="Settings"><LoadingState rows={3} /></AppShell>;
  if (isError || !data) return <AppShell title="Settings"><ErrorState message="Couldn't load settings." onRetry={refetch} /></AppShell>;

  return (
    <AppShell title="Settings">
      <div className="max-w-md rounded-lg border border-fd-khaki bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-fd-cacao">Organization</h3>
        {canEdit ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(name || data.name);
            }}
          >
            <Input label="Organization name" defaultValue={data.name} onChange={(e) => setName(e.target.value)} maxLength={255} />
            <Button type="submit" disabled={mutation.isPending} className="self-start">
              Save changes
            </Button>
          </form>
        ) : (
          <>
            <p className="text-sm text-fd-cacao">{data.name}</p>
            <p className="mt-2 text-xs text-fd-taupe">Only Admins and Owners can edit organization settings.</p>
          </>
        )}
      </div>
    </AppShell>
  );
}
