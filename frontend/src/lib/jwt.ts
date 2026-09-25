import type { Role } from "../types";

export interface JwtPayload {
  sub: string;
  org_id: string;
  role: Role;
  exp: number;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as JwtPayload;
  } catch {
    return null;
  }
}
