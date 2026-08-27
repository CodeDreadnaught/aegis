export type ImportKind = "equipment" | "operationalReadings" | "maintenance";

export type ImportFieldDefinition = {
  aliases: string[];
  canonical: string;
  label: string;
  required: boolean;
};

export type ImportDefinition = {
  description: string;
  fields: ImportFieldDefinition[];
  fileInputName: string;
  kind: ImportKind;
  templateFileName: string;
  title: string;
};

export const importDefinitions = {
  equipment: {
    description:
      "Register equipment records. Initial readings can be included in the same file when the assets are already operating.",
    fileInputName: "equipmentImportFile",
    kind: "equipment",
    templateFileName: "aegis-equipment-import-template.csv",
    title: "Asset import",
    fields: [
      field("assetTag", "Asset tag", true, ["asset_tag", "equipmentAssetTag"]),
      field("name", "Equipment name", true, ["equipmentName", "equipment_name"]),
      field("category", "Category", true, ["equipmentCategory"]),
      field("status", "Status", false, ["equipmentStatus"]),
      field("location", "Location", true, ["site", "area"]),
      field("manufacturer", "Manufacturer", false, ["maker"]),
      field("model", "Model", false, ["modelNumber"]),
      field("serialNumber", "Serial number", false, ["serial_number"]),
      field("installationDate", "Installation date", false, [
        "installation_date",
      ]),
      field("description", "Description", false, ["notes"]),
      field("recordedAt", "Initial reading recorded at", false, [
        "recorded_at",
        "timestamp",
      ]),
      field("type", "Product type", false, ["productType", "product_type"]),
      field("airTemperatureKelvin", "Air temperature (K)", false, [
        "air_temperature_k",
        "air_temperature_kelvin",
      ]),
      field("processTemperatureKelvin", "Process temperature (K)", false, [
        "process_temperature_k",
        "process_temperature_kelvin",
      ]),
      field("rotationalSpeedRpm", "Rotational speed (rpm)", false, [
        "rotational_speed_rpm",
      ]),
      field("torqueNm", "Torque (Nm)", false, ["torque_nm"]),
      field("toolWearMinutes", "Tool wear (min)", false, [
        "tool_wear_minutes",
      ]),
      field("pressureBar", "Pressure (bar)", false, ["pressure_bar"]),
      field("vibrationMmS", "Vibration (mm/s)", false, ["vibration_mm_s"]),
      field("flowRateBpd", "Flow rate (bpd)", false, ["flow_rate_bpd"]),
      field("operatingHours", "Operating hours", false, ["operating_hours"]),
    ],
  },
  operationalReadings: {
    description:
      "Import telemetry from a sensor export. Each row can identify its asset, or the selected fallback equipment is used.",
    fileInputName: "sensorImportFile",
    kind: "operationalReadings",
    templateFileName: "aegis-operational-readings-import-template.csv",
    title: "Sensor import",
    fields: [
      field("equipmentId", "Equipment ID", false, ["equipment_id"]),
      field("assetTag", "Asset tag", false, ["asset_tag", "equipmentAssetTag"]),
      field("recordedAt", "Recorded at", true, ["recorded_at", "timestamp"]),
      field("type", "Product type", false, ["productType", "product_type"]),
      field("airTemperatureKelvin", "Air temperature (K)", true, [
        "air_temperature_k",
        "air_temperature_kelvin",
      ]),
      field("processTemperatureKelvin", "Process temperature (K)", true, [
        "process_temperature_k",
        "process_temperature_kelvin",
      ]),
      field("rotationalSpeedRpm", "Rotational speed (rpm)", true, [
        "rotational_speed_rpm",
      ]),
      field("torqueNm", "Torque (Nm)", true, ["torque_nm"]),
      field("toolWearMinutes", "Tool wear (min)", true, [
        "tool_wear_minutes",
      ]),
      field("pressureBar", "Pressure (bar)", false, ["pressure_bar"]),
      field("vibrationMmS", "Vibration (mm/s)", false, ["vibration_mm_s"]),
      field("flowRateBpd", "Flow rate (bpd)", false, ["flow_rate_bpd"]),
      field("operatingHours", "Operating hours", false, ["operating_hours"]),
    ],
  },
  maintenance: {
    description:
      "Import maintenance records for one or more equipment items.",
    fileInputName: "maintenanceImportFile",
    kind: "maintenance",
    templateFileName: "aegis-maintenance-import-template.csv",
    title: "Maintenance import",
    fields: [
      field("equipmentId", "Equipment ID", false, ["equipment_id"]),
      field("assetTag", "Asset tag", false, ["asset_tag", "equipmentAssetTag"]),
      field("type", "Maintenance type", true, [
        "maintenanceType",
        "workType",
      ]),
      field("description", "Work notes", true, ["notes", "workNotes"]),
      field("performedAt", "Performed at", true, ["performed_at", "date"]),
      field("nextDueDate", "Next due date", false, [
        "next_due_date",
        "dueDate",
      ]),
      field("status", "Status", false, ["maintenanceStatus"]),
    ],
  },
} satisfies Record<ImportKind, ImportDefinition>;

export function normaliseImportHeader(header: string) {
  return header.trim().replace(/[\s_-]+/g, "").toLowerCase();
}

export function buildTemplateCsv(definition: ImportDefinition) {
  const headers = definition.fields.map((item) => item.canonical);
  const sample = Object.fromEntries(
    definition.fields.map((item) => [item.canonical, sampleValue(item.canonical)])
  );

  return [
    headers.join(","),
    headers.map((header) => csvEscape(sample[header] ?? "")).join(","),
  ].join("\n");
}

function field(
  canonical: string,
  label: string,
  required: boolean,
  aliases: string[] = []
): ImportFieldDefinition {
  return {
    aliases: [canonical, ...aliases],
    canonical,
    label,
    required,
  };
}

function sampleValue(canonical: string) {
  const values: Record<string, string> = {
    airTemperatureKelvin: "298.15",
    assetTag: "AEG-CMP-014",
    category: "COMPRESSOR",
    description: "Routine inspection completed",
    equipmentId: "",
    flowRateBpd: "1145",
    installationDate: "2024-05-10",
    location: "Gas Compressor Train B",
    manufacturer: "Aegis Demo Works",
    model: "SEP-600",
    name: "Gas Compressor Train B",
    nextDueDate: "2026-10-05",
    operatingHours: "1280",
    performedAt: "2026-08-25",
    pressureBar: "46",
    processTemperatureKelvin: "307.15",
    recordedAt: "2026-08-25T12:30:00",
    rotationalSpeedRpm: "1450",
    serialNumber: "SN-014",
    status: "ACTIVE",
    toolWearMinutes: "120",
    torqueNm: "42",
    type: "M",
    vibrationMmS: "2.18",
  };

  return values[canonical] ?? "";
}

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
