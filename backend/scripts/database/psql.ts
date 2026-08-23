import { spawnSync } from "node:child_process";

function connectionEnvironment(databaseUrl: string): NodeJS.ProcessEnv {
  const connection = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(connection.protocol)) {
    throw new Error(
      "DATABASE_URL must use the postgres:// or postgresql:// scheme.",
    );
  }

  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    PGDATABASE: decodeURIComponent(connection.pathname.replace(/^\//, "")),
  };
  if (connection.hostname) environment.PGHOST = connection.hostname;
  if (connection.port) environment.PGPORT = connection.port;
  if (connection.username)
    environment.PGUSER = decodeURIComponent(connection.username);
  if (connection.password)
    environment.PGPASSWORD = decodeURIComponent(connection.password);
  const sslMode = connection.searchParams.get("sslmode");
  if (sslMode) environment.PGSSLMODE = sslMode;
  return environment;
}

function executePsql(
  databaseUrl: string,
  args: string[],
  input?: string,
): string {
  const result = spawnSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", ...args], {
    input,
    encoding: "utf8",
    env: connectionEnvironment(databaseUrl),
  });

  if (result.error)
    throw new Error(`Unable to start psql: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(
      result.stderr.trim() ||
        `psql exited with status ${result.status ?? "unknown"}.`,
    );
  }
  return result.stdout.trim();
}

export function runPsql(databaseUrl: string, sql: string): string {
  return executePsql(databaseUrl, ["-qAt"], sql);
}

export function runPsqlFile(databaseUrl: string, filePath: string): void {
  executePsql(databaseUrl, ["--single-transaction", "--file", filePath]);
}
