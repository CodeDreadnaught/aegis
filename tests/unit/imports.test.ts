import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { importDefinitions } from "@/features/imports/definitions";
import {
  buildImportPreview,
  mapImportRows,
  parseImportFile,
  resolveImportMapping,
} from "@/features/imports/parser";
import { validateOperationalReadingImportRow } from "@/features/imports/preview-validation";

describe("spreadsheet imports", () => {
  it("maps exact aliases after header normalization", async () => {
    const file = new File(
      [
        [
          "Asset Tag,Equipment Name,Category,Location",
          "AEG-CMP-014,Gas Compressor Train B,COMPRESSOR,Train B",
        ].join("\n"),
      ],
      "equipment.csv",
      { type: "text/csv" }
    );

    const sheet = await parseImportFile(file);
    const mapping = resolveImportMapping(
      importDefinitions.equipment,
      sheet.headers
    );
    const rows = mapImportRows(sheet.rows, mapping.mapping);

    expect(mapping.missingRequired).toEqual([]);
    expect(rows[0]).toMatchObject({
      assetTag: "AEG-CMP-014",
      category: "COMPRESSOR",
      location: "Train B",
      name: "Gas Compressor Train B",
    });
  });

  it("suggests close headers without silently applying them", () => {
    const mapping = resolveImportMapping(importDefinitions.equipment, [
      "Asset Ref",
      "Equipment Nme",
      "Category",
      "Location",
    ]);

    expect(mapping.mapping.name).toBeUndefined();
    expect(mapping.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonical: "name",
          header: "Equipment Nme",
          kind: "suggestion",
        }),
      ])
    );
  });

  it("uses explicit manual mappings for unknown column names", () => {
    const mapping = resolveImportMapping(
      importDefinitions.equipment,
      ["Asset Ref", "Equipment Title", "Kind", "Area"],
      {
        assetTag: "Asset Ref",
        category: "Kind",
        location: "Area",
        name: "Equipment Title",
      }
    );

    expect(mapping.missingRequired).toEqual([]);
    expect(mapping.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonical: "assetTag",
          header: "Asset Ref",
          kind: "manual",
        }),
      ])
    );
  });

  it("reports missing required columns and row-level validation errors", async () => {
    const file = new File(
      [
        [
          "Asset Tag,Recorded At,Air Temperature K,Process Temperature K,Rotational Speed RPM,Torque Nm,Tool Wear Min",
          "AEG-CMP-014,2026-08-25T12:30:00,100,307,1450,42,120",
        ].join("\n"),
      ],
      "readings.csv",
      { type: "text/csv" }
    );
    const sheet = await parseImportFile(file);
    const preview = buildImportPreview(
      importDefinitions.operationalReadings,
      sheet,
      {
        airTemperatureKelvin: "Air Temperature K",
        processTemperatureKelvin: "Process Temperature K",
        rotationalSpeedRpm: "Rotational Speed RPM",
        toolWearMinutes: "Tool Wear Min",
        torqueNm: "Torque Nm",
      },
      validateOperationalReadingImportRow
    );

    expect(preview.missingRequired).toEqual([]);
    expect(preview.rowErrors[0]?.message).toContain("airTemperatureKelvin");
  });

  it("parses the first worksheet from an Excel upload", async () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["assetTag", "name", "category", "location"],
      ["AEG-PMP-001", "Injection Pump", "PUMP", "Well Pad A"],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");

    const file = new File(
      [XLSX.write(workbook, { bookType: "xlsx", type: "array" })],
      "equipment.xlsx",
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    );
    const sheet = await parseImportFile(file);

    expect(sheet.headers).toEqual(["assetTag", "name", "category", "location"]);
    expect(sheet.rows[0]).toMatchObject({
      assetTag: "AEG-PMP-001",
      name: "Injection Pump",
    });
  });
});
