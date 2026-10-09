#!/usr/bin/env python3
"""
Convert Step Oiltools expenditure Excel file to app's CSV invoice format.
"""

import openpyxl
import csv
from datetime import datetime
from pathlib import Path

# Input and output paths
input_file = Path("Invoices/Drilling Fluids/Step oiltools/SOPK Expenditure Status for  OGDCL OBM Contract 2025-2028 (1-Sep-25 to 30-June-2026).xlsx")
output_file = Path("Invoices/Drilling Fluids/Step oiltools/converted_invoices.csv")

# App's expected CSV headers
headers = [
    "srNo", "vendor", "invoiceNo", "contractNo", "wellName", "invoiceDate",
    "receivingDate", "clearanceDate", "loginDate", "yr", "receivingMonth",
    "serviceMonth", "qtr", "service", "type", "department", "region", "rig",
    "location", "amountInclTax", "status"
]

def read_excel_file(filepath):
    """Read Excel file and extract data."""
    wb = openpyxl.load_workbook(filepath)
    ws = wb.active

    print(f"Reading Excel file: {filepath}")
    print(f"Sheet name: {ws.title}")
    print(f"Dimensions: {ws.dimensions}")

    # Print first few rows to understand structure
    print("\nFirst 5 rows:")
    for i, row in enumerate(ws.iter_rows(min_row=1, max_row=5, values_only=True), 1):
        print(f"Row {i}: {row}")

    return wb, ws

def extract_invoice_data(ws):
    """Extract invoice data from worksheet."""
    invoices = []
    vendor = "Step Oiltools"
    department = "Drilling Fluids"

    # Skip header rows and extract data
    for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
        if not row or all(cell is None for cell in row):
            continue

        # Extract columns based on Excel structure
        # Adjust column indices based on actual file structure
        try:
            invoice = {
                "srNo": row_idx - 2,  # Sequential number
                "vendor": vendor,
                "invoiceNo": str(row[0]) if row[0] else "",
                "contractNo": "OGDCL-OBM-2025-2028",
                "wellName": str(row[1]) if len(row) > 1 and row[1] else "",
                "invoiceDate": str(row[2]) if len(row) > 2 and row[2] else "",
                "receivingDate": "",
                "clearanceDate": "",
                "loginDate": datetime.now().strftime("%Y-%m-%d"),
                "yr": "2025",
                "receivingMonth": "",
                "serviceMonth": "",
                "qtr": "",
                "service": "Well Services",
                "type": "Contractor Services",
                "department": department,
                "region": "South",
                "rig": str(row[1]) if len(row) > 1 and row[1] else "",
                "location": "",
                "amountInclTax": str(row[3]) if len(row) > 3 and row[3] else "0",
                "status": "Pending"
            }
            invoices.append(invoice)
        except Exception as e:
            print(f"Error processing row {row_idx}: {e}")
            continue

    return invoices

def write_csv_file(invoices, output_path, headers):
    """Write invoices to CSV file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(invoices)

    print(f"\n✅ Converted {len(invoices)} invoices")
    print(f"Output saved to: {output_path}")

def main():
    """Main conversion function."""
    try:
        # Read Excel file
        wb, ws = read_excel_file(input_file)

        # Extract data
        invoices = extract_invoice_data(ws)

        # Write CSV
        write_csv_file(invoices, output_file, headers)

        print("\n✅ Conversion complete!")
        print(f"You can now import {output_file.name} into the app")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
