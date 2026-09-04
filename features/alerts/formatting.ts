export function formatAlertLabel(value: string) {
  return value
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

export function alertSeverityClass(severity: string) {
  if (severity === "CRITICAL") {
    return "border-red-300 bg-red-50 text-red-700";
  }

  if (severity === "HIGH") {
    return "border-orange-300 bg-orange-50 text-orange-700";
  }

  if (severity === "MEDIUM") {
    return "border-amber-300 bg-amber-50 text-amber-700";
  }

  return "border-sky-300 bg-sky-50 text-sky-700";
}
