import { client } from "./client";
import type { Organization, User } from "../types";

export interface TokenResponse {
  access_token: string;
  user: User;
  organization: Organization;
}

export async function signup(data: {
  name: string;
  email: string;
  password: string;
  organization_name: string;
}): Promise<TokenResponse> {
  return (await client.post("/api/auth/signup", data)).data;
}

export async function login(data: { email: string; password: string }): Promise<TokenResponse> {
  return (await client.post("/api/auth/login", data)).data;
}

export async function refresh(): Promise<{ access_token: string }> {
  return (await client.post("/api/auth/refresh")).data;
}

export async function logout(): Promise<void> {
  await client.post("/api/auth/logout");
}

export async function forgotPassword(email: string): Promise<void> {
  await client.post("/api/auth/forgot-password", { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await client.post("/api/auth/reset-password", { token, password });
}

export async function getMe(): Promise<User> {
  return (await client.get("/api/users/me")).data;
}

export async function updateMe(data: { name?: string; password?: string }): Promise<User> {
  return (await client.patch("/api/users/me", data)).data;
}
