#!/usr/bin/env node

import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const inputFile = path.join(
  __dirname,
  "..",
  "Invoices/Drilling Fluids/Step oiltools/SOPK Expenditure Status for  OGDCL OBM Contract 2025-2028 (1-Sep-25 to 30-June-2026).xlsx"
);
const outputFile = path.join(
  __dirname,
  "..",
  "Invoices/Drilling Fluids/Step oiltools/converted_invoices.csv"
);

const appHeaders = [
  "srNo",
  "vendor",
  "invoiceNo",
  "contractNo",
  "wellName",
  "invoiceDate",
  "receivingDate",
  "clearanceDate",
  "loginDate",
  "yr",
  "receivingMonth",
  "serviceMonth",
  "qtr",
  "service",
  "type",
  "department",
  "region",
  "rig",
  "location",
  "amountInclTax",
  "status",
];

try {
  console.log(`📖 Reading Excel file: ${inputFile}`);

  if (!fs.existsSync(inputFile)) {
    throw new Error(`File not found: ${inputFile}`);
  }

  const workbook = XLSX.readFile(inputFile);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  console.log(`📄 Sheet: ${sheetName}`);
  console.log(`📊 Dimensions: ${worksheet["!ref"]}`);

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  console.log(`\n📋 Found ${data.length} rows`);
  console.log("First row:", data[0]);

  // Map Excel columns to app format
  const invoices = data.map((row, idx) => {
    // Detect actual column names from Excel
    const invoiceNoCol = Object.keys(row).find((k) =>
      k.toLowerCase().includes("invoice")
    );
    const amountCol = Object.keys(row).find((k) =>
      k.toLowerCase().includes("amount") ||
      k.toLowerCase().includes("expenditure") ||
      k.toLowerCase().includes("cost")
    );
    const dateCol = Object.keys(row).find((k) =>
      k.toLowerCase().includes("date")
    );

    return {
      srNo: idx + 1,
      vendor: "Step Oiltools",
      invoiceNo: row[invoiceNoCol] || "",
      contractNo: "OGDCL-OBM-2025-2028",
      wellName: Object.values(row)[1] || "",
      invoiceDate: row[dateCol] || new Date().toISOString().split("T")[0],
      receivingDate: "",
      clearanceDate: "",
      loginDate: new Date().toISOString().split("T")[0],
      yr: "2025",
      receivingMonth: "",
      serviceMonth: "",
      qtr: "",
      service: "Well Services",
      type: "Drilling Fluids",
      department: "Drilling Fluids",
      region: "South",
      rig: Object.values(row)[1] || "",
      location: "",
      amountInclTax: row[amountCol] || "0",
      status: "Pending",
    };
  });

  // Write CSV
  const csvPath = path.dirname(outputFile);
  if (!fs.existsSync(csvPath)) {
    fs.mkdirSync(csvPath, { recursive: true });
  }

  const csvContent = [
    appHeaders.join(","),
    ...invoices.map((inv) => appHeaders.map((h) => `"${inv[h]}"`).join(",")),
  ].join("\n");

  fs.writeFileSync(outputFile, csvContent, "utf-8");

  console.log(`\n✅ Converted ${invoices.length} invoices`);
  console.log(`📁 Output saved to: ${outputFile}`);
  console.log(`\n📌 Next step: Open the app and import the CSV file`);
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
