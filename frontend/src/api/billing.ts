import { client } from "./client";
import type { Plan, Subscription, Usage } from "../types";

export async function getSubscription(): Promise<Subscription> {
  return (await client.get("/api/billing/subscription")).data;
}

export async function updateSubscription(plan: Plan): Promise<Subscription> {
  return (await client.patch("/api/billing/subscription", { plan })).data;
}

export async function getUsage(): Promise<Usage> {
  return (await client.get("/api/billing/usage")).data;
}
