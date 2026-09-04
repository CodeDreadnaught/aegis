const sensitiveMetadataKeys = [
  "password",
  "passwordHash",
  "token",
  "tokenHash",
  "secret",
  "session",
] as const;

export function safeMetadataSummary(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "No metadata";
  }

  const entries = Object.entries(metadata).filter(([key]) => {
    const lowerKey = key.toLowerCase();
    return !sensitiveMetadataKeys.some((sensitiveKey) =>
      lowerKey.includes(sensitiveKey.toLowerCase())
    );
  });

  if (!entries.length) {
    return "Metadata redacted";
  }

  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${formatMetadataValue(value)}`)
    .join(", ");
}

export function formatAuditAction(action: string) {
  return action
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined) {
    return "not set";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return "object";
}
