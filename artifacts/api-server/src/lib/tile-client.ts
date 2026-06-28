import { randomUUID } from "crypto";
import { logger } from "./logger";

const API_BASE = "https://production.tile-api.com/api/v1";
const DEFAULT_API_VERSION = "1.0";
const DEFAULT_APP_ID = "ios-tile-production";
const DEFAULT_APP_VERSION = "2.89.1.4774";
const DEFAULT_USER_AGENT = "Tile/4774 CFNetwork/1312 Darwin/21.0.0";

interface TileState {
  tile_id: string;
}

interface TileApiResult {
  result: {
    uuid: string;
    name: string;
    tile_type: string;
    archetype: string;
    is_dead: boolean;
    firmware_version: string;
    hw_version: string;
    last_tile_state?: {
      latitude: number;
      longitude: number;
      altitude: number;
      h_accuracy: number;
      timestamp: number;
      lost_timestamp: number;
      is_lost: boolean;
    };
  };
}

interface HistoryEntry {
  latitude: number;
  longitude: number;
  altitude: number;
  h_accuracy: number;
  timestamp: number;
}

let sessionExpiry: number | null = null;
let clientEstablished = false;
const clientUuid = randomUUID();

// Cookie jar to persist session cookies across requests
let sessionCookies: string[] = [];

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": DEFAULT_USER_AGENT,
    "tile_api_version": DEFAULT_API_VERSION,
    "tile_app_id": DEFAULT_APP_ID,
    "tile_app_version": DEFAULT_APP_VERSION,
    "tile_client_uuid": clientUuid,
    ...extra,
  };
  if (sessionCookies.length > 0) {
    headers["Cookie"] = sessionCookies.join("; ");
  }
  return headers;
}

async function tileRequest(
  method: string,
  endpoint: string,
  body?: Record<string, string>
): Promise<unknown> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}/${endpoint}`;

  const headers = getHeaders(
    body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}
  );

  const options: RequestInit = {
    method: method.toUpperCase(),
    headers,
    redirect: "follow",
  };

  if (body) {
    options.body = new URLSearchParams(body).toString();
  }

  logger.debug({ method, url }, "Tile API request");

  const resp = await fetch(url, options);

  // Persist any Set-Cookie headers
  const setCookieHeader = resp.headers.get("set-cookie");
  if (setCookieHeader) {
    // Parse cookies and add to our jar (overwrite existing keys)
    const newCookies = setCookieHeader.split(/,(?=[^ ])/);
    for (const cookieFull of newCookies) {
      const cookiePart = cookieFull.split(";")[0].trim();
      const [key] = cookiePart.split("=");
      // Remove existing cookie with same key and add the new one
      sessionCookies = sessionCookies.filter((c) => !c.startsWith(key + "="));
      sessionCookies.push(cookiePart);
    }
  }

  if (!resp.ok) {
    const text = await resp.text();
    logger.warn({ status: resp.status, url, text }, "Tile API error response");
    if (resp.status === 401) {
      throw new Error("Invalid Tile credentials");
    }
    throw new Error(`Tile API error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  return data;
}

export async function initSession(): Promise<void> {
  const email = process.env.TILE_EMAIL;
  const password = process.env.TILE_PASSWORD;

  if (!email || !password) {
    throw new Error("TILE_EMAIL and TILE_PASSWORD environment variables are required");
  }

  // Reset expiry to avoid re-entrant loops
  sessionExpiry = null;
  // Clear cookies on re-init
  sessionCookies = [];

  if (!clientEstablished) {
    await tileRequest("put", `clients/${clientUuid}`, {
      app_id: DEFAULT_APP_ID,
      app_version: DEFAULT_APP_VERSION,
      locale: "en-US",
    });
    clientEstablished = true;
    logger.info("Tile client established");
  }

  const resp = await tileRequest("post", `clients/${clientUuid}/sessions`, {
    email,
    password,
  }) as { result: { session_expiration_timestamp: number; user: { user_uuid: string } } };

  sessionExpiry = resp.result.session_expiration_timestamp;
  logger.info({ expires: sessionExpiry, cookies: sessionCookies.length }, "Tile session initialized");
}

async function ensureSession(): Promise<void> {
  if (!sessionExpiry || sessionExpiry <= Date.now()) {
    await initSession();
  }
}

export interface TileDevice {
  uuid: string;
  name: string;
  kind: string;
  archetype: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  accuracy: number | null;
  lastSeen: string | null;
  lost: boolean;
  dead: boolean;
  firmwareVersion: string;
  hardwareVersion: string;
}

export async function getTiles(): Promise<TileDevice[]> {
  await ensureSession();

  const statesResp = await tileRequest("get", "tiles/tile_states") as {
    result: TileState[];
  };

  const tileIds = statesResp.result.map((t) => t.tile_id);
  logger.info({ count: tileIds.length }, "Got tile IDs");

  const details = await Promise.allSettled(
    tileIds.map((id) => tileRequest("get", `tiles/${id}`))
  );

  const tiles: TileDevice[] = [];
  for (const result of details) {
    if (result.status === "rejected") {
      logger.warn("Failed to fetch tile detail: %s", result.reason);
      continue;
    }
    const data = result.value as TileApiResult;
    const r = data.result;
    const state = r.last_tile_state;

    tiles.push({
      uuid: r.uuid,
      name: r.name,
      kind: r.tile_type,
      archetype: r.archetype,
      latitude: state ? state.latitude : null,
      longitude: state ? state.longitude : null,
      altitude: state ? state.altitude : null,
      accuracy: state ? state.h_accuracy : null,
      lastSeen: state ? new Date(state.timestamp).toISOString() : null,
      lost: state ? state.is_lost : true,
      dead: r.is_dead,
      firmwareVersion: r.firmware_version,
      hardwareVersion: r.hw_version,
    });
  }

  return tiles;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: string;
}

export async function getTileHistory(tileUuid: string): Promise<LocationPoint[]> {
  await ensureSession();

  const endTs = Date.now();
  const startTs = endTs - 7 * 24 * 60 * 60 * 1000;

  try {
    const resp = await tileRequest(
      "get",
      `tiles/location/history/${tileUuid}?aggregation=false&start_ts=${startTs}&end_ts=${endTs}`
    ) as { result: HistoryEntry[] };

    if (!resp.result || !Array.isArray(resp.result)) return [];

    return resp.result.map((entry) => ({
      latitude: entry.latitude,
      longitude: entry.longitude,
      altitude: entry.altitude ?? null,
      accuracy: entry.h_accuracy ?? null,
      timestamp: new Date(entry.timestamp).toISOString(),
    }));
  } catch (err) {
    logger.warn("Could not fetch history for tile %s: %s", tileUuid, err);
    return [];
  }
}
