import { client } from "./client";
import type { Membership, Organization, Role } from "../types";
import type { TokenResponse } from "./auth";

export async function listMembers(orgId: string): Promise<Membership[]> {
  return (await client.get(`/api/organizations/${orgId}/members`)).data;
}

export async function inviteMember(orgId: string, email: string, role: Role): Promise<void> {
  await client.post(`/api/organizations/${orgId}/invites`, { email, role });
}

export async function updateMemberRole(orgId: string, userId: string, role: Role): Promise<void> {
  await client.patch(`/api/organizations/${orgId}/members/${userId}`, { role });
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  await client.delete(`/api/organizations/${orgId}/members/${userId}`);
}

export async function getOrganization(orgId: string): Promise<Organization> {
  return (await client.get(`/api/organizations/${orgId}`)).data;
}

export async function updateOrganization(orgId: string, name: string): Promise<Organization> {
  return (await client.patch(`/api/organizations/${orgId}`, { name })).data;
}

export async function acceptInvite(data: { token: string; name?: string; password?: string }): Promise<TokenResponse> {
  return (await client.post("/api/organizations/invites/accept", data)).data;
}
