import { z } from "zod";

const envSchema = z.object({
  HYDRADB_HTTP_URL: z.string().url().default("http://127.0.0.1:8443"),
  HYDRADB_ADMIN_URL: z.string().url().default("http://127.0.0.1:9090"),
  HYDRADB_NAMESPACE: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{1,64}$/)
    .default("default"),
  HYDRADB_GRAPH_ID: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{1,64}$/)
    .default("default"),
  HYDRADB_CELL_ID: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{1,64}$/)
    .default("cell-0"),
  HYDRADB_TOKEN: z.string().min(16),
  HYDRADB_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30_000).default(15_000),
  BLASTPATH_FIXTURE_ROOT: z.string().min(1).default("./fixtures"),
  ENABLE_SEED_ROUTE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type ServerEnv = z.infer<typeof envSchema> & {
  hydradbHttpUrl: string;
  hydradbAdminUrl: string;
};

function normalizeUrl(value: string, variable: string): string {
  const url = new URL(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname)?.slice(1).map(Number);
  const isPrivateIpv4 = Boolean(
    ipv4 &&
      ipv4.every((octet) => octet >= 0 && octet <= 255) &&
      (ipv4[0] === 10 ||
        ipv4[0] === 127 ||
        (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) ||
        (ipv4[0] === 192 && ipv4[1] === 168)),
  );
  const isPrivateIpv6 =
    hostname === "::1" ||
    (hostname.includes(":") &&
      (hostname.startsWith("fc") || hostname.startsWith("fd") || /^fe[89ab]/.test(hostname)));
  const isLocal = ["localhost", "hydradb"].includes(hostname) || isPrivateIpv4 || isPrivateIpv6;
  if (url.protocol !== "https:" && (url.protocol !== "http:" || !isLocal)) {
    throw new Error(`${variable} must use HTTPS outside local HydraDB hosts`);
  }
  return value.replace(/\/$/, "");
}

export function getServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => issue.path.join(".") || "environment");
    throw new Error(`Invalid server environment: ${names.join(", ")}`);
  }
  return {
    ...parsed.data,
    hydradbHttpUrl: normalizeUrl(parsed.data.HYDRADB_HTTP_URL, "HYDRADB_HTTP_URL"),
    hydradbAdminUrl: normalizeUrl(parsed.data.HYDRADB_ADMIN_URL, "HYDRADB_ADMIN_URL"),
  };
}
