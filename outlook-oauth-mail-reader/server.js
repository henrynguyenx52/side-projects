import http from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HOST = "127.0.0.1";
const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const TENANT = process.env.OUTLOOK_TENANT?.trim() || "common";
const projectDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(projectDir, "public");
const ACCOUNTS_FILE = process.env.OUTLOOK_ACCOUNTS_FILE?.trim()
  ? path.resolve(process.env.OUTLOOK_ACCOUNTS_FILE.trim())
  : path.join(projectDir, "accounts.json");
const SCOPES = "openid profile offline_access User.Read Mail.Read";
const AUTHORITY = `https://login.microsoftonline.com/${encodeURIComponent(TENANT)}/oauth2/v2.0`;
const GRAPH = "https://graph.microsoft.com/v1.0";

const pendingAuthorizations = new Map();
const sessions = new Map();
let accountMapping = new Map();
let accountMappingModifiedAt = 0;

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16_384) throw new Error("Request body quá lớn.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function isClientId(value) {
  return /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
}

function extractAccount(raw, defaultKey = "") {
  if (typeof raw === "string") {
    if (raw.includes("|")) {
      const parts = raw.split("|").map((p) => p.trim());
      return {
        id: normalizeEmail(parts[0]),
        pass: parts[1] || "",
        refreshToken: parts[2] || "",
        clientId: parts[3] || "",
        recoveryEmail: parts[4] || "",
      };
    }
    return {
      id: normalizeEmail(defaultKey),
      pass: "",
      refreshToken: "",
      clientId: raw.trim(),
      recoveryEmail: "",
    };
  }

  if (raw && typeof raw === "object") {
    const id = normalizeEmail(raw.id || raw.ID || raw.email || raw.Email || raw.username || defaultKey);
    const pass = String(raw.pass ?? raw.PASS ?? raw.password ?? raw.Password ?? "").trim();
    const refreshToken = String(raw.refreshToken ?? raw.Refresh_Token ?? raw.refresh_token ?? raw.RefreshToken ?? "").trim();
    const clientId = String(raw.clientId ?? raw.Client_id ?? raw.client_id ?? raw.ClientId ?? "").trim();
    const recoveryEmail = String(raw.recoveryEmail ?? raw.recovery_email ?? raw.Recovery_Email ?? raw.mailPhu ?? "").trim();
    return { id, pass, refreshToken, clientId, recoveryEmail };
  }

  return null;
}

async function loadAccountMapping() {
  let fileStat;
  try {
    fileStat = await stat(ACCOUNTS_FILE);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Không tìm thấy file accounts: ${ACCOUNTS_FILE}`);
    }
    throw error;
  }

  if (fileStat.mtimeMs === accountMappingModifiedAt && accountMapping.size) return accountMapping;

  const content = await readFile(ACCOUNTS_FILE, "utf8");
  const nextMapping = new Map();
  const errors = [];
  const trimmed = content.trim();
  let items = [];

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error("File accounts không phải JSON hợp lệ.");
    }

    if (Array.isArray(parsed)) {
      items = parsed.map((item) => extractAccount(item)).filter(Boolean);
    } else if (parsed && typeof parsed === "object") {
      for (const [key, value] of Object.entries(parsed)) {
        const acc = extractAccount(value, key);
        if (acc) items.push(acc);
      }
    }
  } else {
    const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.includes("|")) {
        const acc = extractAccount(line);
        if (acc) items.push(acc);
      }
    }
  }

  for (const item of items) {
    if (!isEmail(item.id)) errors.push(`email không hợp lệ: ${item.id}`);
    else if (!isClientId(item.clientId)) errors.push(`Client ID của ${item.id} không hợp lệ`);
    else if (nextMapping.has(item.id)) errors.push(`email bị trùng sau khi chuẩn hóa: ${item.id}`);
    else nextMapping.set(item.id, item);
  }

  if (errors.length) throw new Error(`File accounts có lỗi (${errors.slice(0, 3).join("; ")}).`);
  if (!nextMapping.size) throw new Error("File accounts chưa có tài khoản hợp lệ.");

  accountMapping = nextMapping;
  accountMappingModifiedAt = fileStat.mtimeMs;
  return accountMapping;
}

async function formPost(url, values) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values),
  });
}

async function graphRequest(accessToken, endpoint) {
  return fetch(`${GRAPH}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function fetchProfile(accessToken) {
  const response = await graphRequest(
    accessToken,
    "/me?$select=id,displayName,mail,userPrincipalName",
  );
  if (!response.ok) throw new Error("Không đọc được hồ sơ Microsoft Graph.");
  return response.json();
}

function accountEmail(profile) {
  return normalizeEmail(profile.mail || profile.userPrincipalName);
}

function createSession(token, profile, clientId) {
  const sessionId = randomBytes(32).toString("base64url");
  sessions.set(sessionId, {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    clientId,
    expiresAt: Date.now() + Math.max(30, Number(token.expires_in || 3600) - 60) * 1000,
    profile,
    createdAt: Date.now(),
  });
  return sessionId;
}

async function refreshSession(session) {
  if (Date.now() < session.expiresAt) return session.accessToken;
  if (!session.refreshToken) throw new Error("Phiên đã hết hạn. Vui lòng đăng nhập lại.");

  const response = await formPost(`${AUTHORITY}/token`, {
    client_id: session.clientId,
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
    scope: SCOPES,
  });
  const token = await response.json();
  if (!response.ok || !token.access_token) {
    throw new Error("Microsoft yêu cầu đăng nhập lại.");
  }

  session.accessToken = token.access_token;
  session.refreshToken = token.refresh_token || session.refreshToken;
  session.expiresAt = Date.now() + Math.max(30, Number(token.expires_in || 3600) - 60) * 1000;
  return session.accessToken;
}

function getSession(req) {
  const sessionId = parseCookies(req).outlook_session;
  const session = sessionId ? sessions.get(sessionId) : undefined;
  return { sessionId, session };
}

function pruneState() {
  const now = Date.now();
  for (const [id, flow] of pendingAuthorizations) {
    if (flow.expiresAt < now) pendingAuthorizations.delete(id);
  }
  for (const [id, session] of sessions) {
    if (session.createdAt + 12 * 60 * 60 * 1000 < now) sessions.delete(id);
  }
}

setInterval(pruneState, 60_000).unref();

async function startAuthorization(req, res) {
  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  if (!isEmail(email)) return sendError(res, 400, "Email không hợp lệ.");

  let account;
  try {
    account = (await loadAccountMapping()).get(email);
  } catch (error) {
    return sendError(res, 503, error.message);
  }
  if (!account) return sendError(res, 404, "Email chưa có trong danh sách tài khoản.");

  if (account.refreshToken) {
    try {
      const response = await formPost(`${AUTHORITY}/token`, {
        client_id: account.clientId,
        grant_type: "refresh_token",
        refresh_token: account.refreshToken,
        scope: SCOPES,
      });
      const token = await response.json();
      if (response.ok && token.access_token) {
        const profile = await fetchProfile(token.access_token);
        const signedInEmail = accountEmail(profile);
        if (signedInEmail && signedInEmail !== email) {
          return sendError(res, 403, `Tài khoản xác thực (${signedInEmail}) không khớp email đã chọn.`);
        }
        if (token.refresh_token) {
          account.refreshToken = token.refresh_token;
        }
        const sessionId = createSession(token, profile, account.clientId);
        return sendJson(
          res,
          200,
          { status: "complete", profile },
          { "Set-Cookie": `outlook_session=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200` },
        );
      }
    } catch (error) {
      console.warn(`Lỗi refresh token cho ${email}: ${error.message}. Đang thử fallback Device Code...`);
    }
  }

  const response = await formPost(`${AUTHORITY}/devicecode`, {
    client_id: account.clientId,
    scope: SCOPES,
  });
  const device = await response.json();
  if (!response.ok) {
    return sendError(res, 502, device.error_description || "Không thể bắt đầu đăng nhập Microsoft.");
  }

  const authId = randomUUID();
  pendingAuthorizations.set(authId, {
    email,
    clientId: account.clientId,
    deviceCode: device.device_code,
    intervalMs: Math.max(5, Number(device.interval || 5)) * 1000,
    nextPollAt: Date.now(),
    expiresAt: Date.now() + Number(device.expires_in || 900) * 1000,
  });

  sendJson(res, 200, {
    status: "pending",
    authId,
    userCode: device.user_code,
    verificationUri: device.verification_uri,
    expiresIn: device.expires_in,
  });
}

async function pollAuthorization(url, res) {
  const authId = url.searchParams.get("id");
  const flow = pendingAuthorizations.get(authId);
  if (!flow) return sendError(res, 404, "Yêu cầu đăng nhập không còn tồn tại.");
  if (flow.expiresAt < Date.now()) {
    pendingAuthorizations.delete(authId);
    return sendError(res, 410, "Mã đăng nhập đã hết hạn.");
  }
  if (Date.now() < flow.nextPollAt) return sendJson(res, 202, { status: "pending" });
  flow.nextPollAt = Date.now() + flow.intervalMs;

  const response = await formPost(`${AUTHORITY}/token`, {
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    client_id: flow.clientId,
    device_code: flow.deviceCode,
  });
  const token = await response.json();

  if (!response.ok) {
    if (token.error === "authorization_pending") return sendJson(res, 202, { status: "pending" });
    if (token.error === "slow_down") {
      flow.intervalMs += 5_000;
      return sendJson(res, 202, { status: "pending" });
    }
    pendingAuthorizations.delete(authId);
    return sendError(res, 400, token.error_description || "Đăng nhập Microsoft thất bại.");
  }

  try {
    const profile = await fetchProfile(token.access_token);
    const signedInEmail = accountEmail(profile);
    if (signedInEmail !== flow.email) {
      pendingAuthorizations.delete(authId);
      return sendError(
        res,
        403,
        `Tài khoản xác thực (${signedInEmail || "không rõ"}) không khớp email đã nhập.`,
      );
    }

    const sessionId = createSession(token, profile, flow.clientId);
    pendingAuthorizations.delete(authId);
    sendJson(
      res,
      200,
      { status: "complete", profile },
      { "Set-Cookie": `outlook_session=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200` },
    );
  } catch (error) {
    pendingAuthorizations.delete(authId);
    sendError(res, 502, error.message);
  }
}

async function listConfiguredAccounts(req, res) {
  try {
    const mapping = await loadAccountMapping();
    const accounts = Array.from(mapping.values()).map((acc) => ({
      email: acc.id,
      hasRefreshToken: Boolean(acc.refreshToken),
    }));
    sendJson(res, 200, { accounts });
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

async function listMessages(req, res, url) {
  const { session } = getSession(req);
  if (!session) return sendError(res, 401, "Vui lòng đăng nhập.");

  const count = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get("count") || "15", 10)));
  try {
    const accessToken = await refreshSession(session);
    const query = new URLSearchParams({
      "$top": String(count),
      "$select": "id,subject,from,receivedDateTime,isRead,bodyPreview,webLink",
      "$orderby": "receivedDateTime desc",
    });
    const response = await graphRequest(accessToken, `/me/messages?${query}`);
    const payload = await response.json();
    if (!response.ok) return sendError(res, response.status, payload.error?.message || "Không đọc được email.");
    sendJson(res, 200, { messages: payload.value || [] });
  } catch (error) {
    sendError(res, 401, error.message);
  }
}

async function serveStatic(res, pathname) {
  const files = {
    "/": ["index.html", "text/html; charset=utf-8"],
    "/app.js": ["app.js", "text/javascript; charset=utf-8"],
    "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  };
  const target = files[pathname];
  if (!target) return false;
  const content = await readFile(path.join(publicDir, target[0]));
  res.writeHead(200, {
    "Content-Type": target[1],
    "Content-Length": content.length,
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  });
  res.end(content);
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);

    if (req.method === "GET" && url.pathname === "/api/accounts") return await listConfiguredAccounts(req, res);
    if (req.method === "POST" && url.pathname === "/api/auth/start") return await startAuthorization(req, res);
    if (req.method === "GET" && url.pathname === "/api/auth/status") return await pollAuthorization(url, res);
    if (req.method === "GET" && url.pathname === "/api/messages") return await listMessages(req, res, url);
    if (req.method === "GET" && url.pathname === "/api/me") {
      const { session } = getSession(req);
      return session ? sendJson(res, 200, { profile: session.profile }) : sendError(res, 401, "Chưa đăng nhập.");
    }
    if (req.method === "POST" && url.pathname === "/api/logout") {
      const { sessionId } = getSession(req);
      if (sessionId) sessions.delete(sessionId);
      return sendJson(res, 200, { ok: true }, { "Set-Cookie": "outlook_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
    }
    if (req.method === "GET" && (await serveStatic(res, url.pathname))) return;

    sendError(res, 404, "Không tìm thấy.");
  } catch (error) {
    sendError(res, 500, error.message || "Lỗi máy chủ.");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Outlook Mail Reader: http://${HOST}:${PORT}`);
  console.log(`Account mapping: ${ACCOUNTS_FILE}`);
});
