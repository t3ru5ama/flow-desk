import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as teamApi from "../../api/team";
import { AppShell } from "../../components/layout/AppShell";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { ROLE_LABELS, roleAtLeast } from "../../lib/constants";
import { formatDate } from "../../lib/format";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";
import type { Role } from "../../types";

const ROLES: Role[] = ["admin", "manager", "member", "viewer"];

export function TeamPage() {
  const org = useAuthStore((s) => s.org);
  const role = useAuthStore((s) => s.role);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);
  const canManage = roleAtLeast(role, "admin");

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [error, setError] = useState<string | null>(null);

  const { data: members, isPending, isError, refetch } = useQuery({
    queryKey: ["members", org?.id],
    queryFn: () => teamApi.listMembers(org!.id),
    enabled: !!org,
  });

  const inviteMutation = useMutation({
    mutationFn: () => teamApi.inviteMember(org!.id, inviteEmail, inviteRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", org?.id] });
      addToast("Invite sent");
      setShowInvite(false);
      setInviteEmail("");
    },
    onError: () => setError("Couldn't send invite. That email may already be a member."),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: Role }) => teamApi.updateMemberRole(org!.id, userId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", org?.id] });
      addToast("Role updated");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => teamApi.removeMember(org!.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", org?.id] });
      addToast("Member removed");
    },
    onError: () => addToast("Couldn't remove member (at least one Owner is required)", "error"),
  });

  return (
    <AppShell title="Team">
      <div className="mb-4 flex justify-end">
        {canManage && <Button onClick={() => setShowInvite(true)}>Invite member</Button>}
      </div>

      {isPending ? (
        <LoadingState rows={5} />
      ) : isError ? (
        <ErrorState message="Couldn't load team members." onRetry={refetch} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-fd-khaki bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-fd-khaki bg-fd-pearl text-xs uppercase text-fd-taupe">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {members?.map((m) => (
                <tr key={m.id} className="border-b border-fd-khaki last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={m.name} size={28} />
                      <span className="text-fd-cacao">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-fd-taupe">{m.email}</td>
                  <td className="px-4 py-3">
                    {canManage && m.role !== "owner" ? (
                      <Select
                        value={m.role}
                        onChange={(e) => roleMutation.mutate({ userId: m.user_id, newRole: e.target.value as Role })}
                        className="w-auto"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      ROLE_LABELS[m.role]
                    )}
                  </td>
                  <td className="px-4 py-3 text-fd-taupe">{formatDate(m.joined_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {canManage && m.role !== "owner" && m.user_id !== currentUserId && (
                      <Button variant="ghost" onClick={() => removeMutation.mutate(m.user_id)}>
                        Remove
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && (
        <Modal title="Invite a member" onClose={() => setShowInvite(false)}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              inviteMutation.mutate();
            }}
          >
            {error && <div className="rounded-md bg-fd-error/10 px-3 py-2 text-sm text-fd-error">{error}</div>}
            <Input label="Email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
            <Select label="Role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowInvite(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                Send invite
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
