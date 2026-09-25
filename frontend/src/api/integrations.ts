import { client } from "./client";
import type { Integration, IntegrationProvider } from "../types";

export async function listIntegrations(): Promise<Integration[]> {
  return (await client.get("/api/integrations")).data;
}

export async function updateIntegration(
  provider: IntegrationProvider,
  data: { connected: boolean; config?: Record<string, unknown> },
): Promise<Integration> {
  return (await client.patch(`/api/integrations/${provider}`, data)).data;
}
