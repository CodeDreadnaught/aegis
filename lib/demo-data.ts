export type RiskLevel = "Low" | "Medium" | "High";

export const equipmentSummary = [
  {
    assetTag: "AEG-PMP-001",
    name: "Injection Pump A",
    category: "Pump",
    location: "Demo Flow Station Alpha",
    healthScore: 91,
    riskLevel: "Low" as const,
  },
  {
    assetTag: "AEG-CMP-014",
    name: "Gas Compressor Train B",
    category: "Compressor",
    location: "Demo Compression Yard",
    healthScore: 68,
    riskLevel: "Medium" as const,
  },
  {
    assetTag: "AEG-SEP-007",
    name: "Three-Phase Separator",
    category: "Separator",
    location: "Demo Manifold Cluster",
    healthScore: 38,
    riskLevel: "High" as const,
  },
];

export const dashboardStats = [
  { label: "Total Equipment", value: "10", detail: "All required categories represented" },
  { label: "Low Risk", value: "6", detail: "Demo equipment currently healthy" },
  { label: "Medium Risk", value: "3", detail: "Requires planned attention" },
  { label: "High Risk", value: "1", detail: "Prioritise inspection workflow" },
];

export const recentActivity = [
  "Operational reading recorded for Injection Pump A",
  "Maintenance review scheduled for Gas Compressor Train B",
  "High-risk alert generated for Three-Phase Separator",
];

export function riskBadgeClass(riskLevel: RiskLevel) {
  if (riskLevel === "Low") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (riskLevel === "Medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}
