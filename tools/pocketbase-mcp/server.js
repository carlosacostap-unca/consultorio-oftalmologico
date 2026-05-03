import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

loadEnvFiles();

const PB_URL = requiredEnv("POCKETBASE_URL").replace(/\/$/, "");
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || "";
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || "";
const PB_ADMIN_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN || "";

let cachedToken = PB_ADMIN_TOKEN;

const server = new McpServer({
  name: "consultorio-pocketbase-mcp",
  version: "0.1.0",
});

server.tool("health", {}, async () => {
  const response = await fetch(`${PB_URL}/api/health`);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`PocketBase health failed ${response.status}: ${detail}`);
  }

  return text(await response.json());
});

server.tool("list_collections", {}, async () => {
  return text(await pb("/api/collections?perPage=200"));
});

server.tool(
  "get_collection",
  {
    collection: z.string().describe("Collection name or id."),
  },
  async ({ collection }) => {
    return text(await pb(`/api/collections/${encodeURIComponent(collection)}`));
  },
);

server.tool(
  "list_records",
  {
    collection: z.string(),
    page: z.number().int().positive().default(1),
    perPage: z.number().int().positive().max(200).default(50),
    filter: z.string().optional(),
    sort: z.string().optional(),
    expand: z.string().optional(),
  },
  async ({ collection, page, perPage, filter, sort, expand }) => {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
    });

    if (filter) params.set("filter", filter);
    if (sort) params.set("sort", sort);
    if (expand) params.set("expand", expand);

    return text(await pb(`/api/collections/${encodeURIComponent(collection)}/records?${params}`));
  },
);

server.tool(
  "get_record",
  {
    collection: z.string(),
    id: z.string(),
    expand: z.string().optional(),
  },
  async ({ collection, id, expand }) => {
    const params = new URLSearchParams();
    if (expand) params.set("expand", expand);
    const query = params.size ? `?${params}` : "";

    return text(
      await pb(`/api/collections/${encodeURIComponent(collection)}/records/${encodeURIComponent(id)}${query}`),
    );
  },
);

server.tool(
  "create_record",
  {
    collection: z.string(),
    data: z.record(z.unknown()),
  },
  async ({ collection, data }) => {
    return text(
      await pb(`/api/collections/${encodeURIComponent(collection)}/records`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    );
  },
);

server.tool(
  "update_record",
  {
    collection: z.string(),
    id: z.string(),
    data: z.record(z.unknown()),
  },
  async ({ collection, id, data }) => {
    return text(
      await pb(`/api/collections/${encodeURIComponent(collection)}/records/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    );
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

async function pb(path, options = {}) {
  const token = await adminToken();
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${PB_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`PocketBase ${response.status}: ${detail}`);
  }

  return response.json();
}

async function adminToken() {
  if (cachedToken) {
    return cachedToken;
  }

  if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    throw new Error("Set POCKETBASE_ADMIN_TOKEN or POCKETBASE_ADMIN_EMAIL/POCKETBASE_ADMIN_PASSWORD.");
  }

  const response = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: PB_ADMIN_EMAIL,
      password: PB_ADMIN_PASSWORD,
    }),
  });

  if (response.ok) {
    const data = await response.json();
    cachedToken = data.token;
    return cachedToken;
  }

  const superuserResponse = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: PB_ADMIN_EMAIL,
      password: PB_ADMIN_PASSWORD,
    }),
  });

  if (!superuserResponse.ok) {
    const adminDetail = await response.text();
    const superuserDetail = await superuserResponse.text();
    throw new Error(
      `PocketBase admin auth failed. /api/admins: ${response.status} ${adminDetail}. _superusers: ${superuserResponse.status} ${superuserDetail}`,
    );
  }

  const data = await superuserResponse.json();
  cachedToken = data.token;
  return cachedToken;
}

function loadEnvFiles() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, ".env"),
    join(here, ".env.local"),
    join(here, "..", "..", ".env.local"),
  ];

  for (const file of candidates) {
    if (existsSync(file)) {
      loadEnvFile(file);
    }
  }
}

function loadEnvFile(file) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function text(data) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function requiredEnv(name) {
  const value = process.env[name] || (name === "POCKETBASE_URL" ? process.env.NEXT_PUBLIC_POCKETBASE_URL : "");

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
