import "server-only";

const API_BASE =
  process.env.CHANJING_API_BASE?.replace(/\/$/, "") ||
  "https://open-api.chanjing.cc/open/v1";

type ApiEnvelope<T> = {
  trace_id?: string;
  code: number;
  msg?: string;
  data: T;
};

type TokenCache = {
  accessToken: string;
  expireIn: number;
};

let tokenCache: TokenCache | null = null;

function requireEnv(name: "CHANJING_APP_ID" | "CHANJING_SECRET_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured on the server`);
  }
  return value;
}

async function parseEnvelope<T>(
  res: Response,
  path: string,
): Promise<ApiEnvelope<T>> {
  const body = (await res.json()) as ApiEnvelope<T>;
  if (body.code !== 0) {
    const err = new Error(
      `ChanJing ${path} failed: code=${body.code} msg=${body.msg ?? ""} trace_id=${body.trace_id ?? ""}`,
    );
    (err as Error & { payload?: ApiEnvelope<T> }).payload = body;
    throw err;
  }
  return body;
}

export async function getAccessToken(force = false): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (!force && tokenCache && tokenCache.expireIn - 120 > now) {
    return tokenCache.accessToken;
  }

  const res = await fetch(`${API_BASE}/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: requireEnv("CHANJING_APP_ID"),
      secret_key: requireEnv("CHANJING_SECRET_KEY"),
    }),
    cache: "no-store",
  });

  const envelope = await parseEnvelope<{
    access_token: string;
    expire_in: number;
  }>(res, "/access_token");

  tokenCache = {
    accessToken: envelope.data.access_token,
    expireIn: envelope.data.expire_in,
  };
  return tokenCache.accessToken;
}

export async function chanjingFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("access_token", token);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  try {
    return await parseEnvelope<T>(res, path);
  } catch (error) {
    const payload = (error as { payload?: ApiEnvelope<unknown> }).payload;
    if (payload?.code === 10400) {
      const retryToken = await getAccessToken(true);
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("access_token", retryToken);
      if (init.body && !retryHeaders.has("Content-Type")) {
        retryHeaders.set("Content-Type", "application/json; charset=utf-8");
      }
      const retryRes = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: retryHeaders,
        cache: "no-store",
      });
      return parseEnvelope<T>(retryRes, path);
    }
    throw error;
  }
}

export function getChanJingApiBase() {
  return API_BASE;
}
