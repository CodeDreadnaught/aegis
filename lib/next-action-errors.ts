export function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object" || !("digest" in error)) {
    return false;
  }

  const digest = (error as { digest?: unknown }).digest;

  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
