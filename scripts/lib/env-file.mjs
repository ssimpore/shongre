import { readFileSync, statSync } from "node:fs";

export function assertPrivateFile(path, label) {
  const stat = statSync(path);
  if (!stat.isFile()) {
    throw new Error(`[Deploy Config] ${label} must be a regular file.`);
  }
  if ((stat.mode & 0o007) !== 0) {
    throw new Error(
      `[Deploy Config] ${label} must not be accessible to other users.`,
    );
  }
}

export function parseEnvFile(path, label, { requirePrivate = true } = {}) {
  if (requirePrivate) assertPrivateFile(path, label);
  const entries = new Map();
  for (const sourceLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = line.startsWith("export ") ? line.slice(7) : line;
    const separator = normalized.indexOf("=");
    if (separator <= 0) {
      throw new Error(`[Deploy Config] ${label} has a malformed line.`);
    }
    const key = normalized.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`[Deploy Config] ${label} has an invalid variable name.`);
    }
    if (entries.has(key)) {
      throw new Error(`[Deploy Config] ${label} repeats ${key}.`);
    }
    let value = normalized.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries.set(key, value);
  }
  return entries;
}

export function loadEnvFiles(paths) {
  const merged = new Map();
  for (const { path, label } of paths) {
    for (const [key, value] of parseEnvFile(path, label)) {
      const previous = merged.get(key);
      if (previous !== undefined && previous !== value) {
        throw new Error(
          `[Deploy Config] ${key} conflicts between host-managed environment files.`,
        );
      }
      merged.set(key, value);
    }
  }
  for (const [key, value] of merged) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return merged;
}
