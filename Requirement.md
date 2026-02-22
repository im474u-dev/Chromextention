# Project Overview

A high-precision, browser-based auditing tool for Excel/CSV files. The extension opens a dedicated full-screen dashboard to guide users through a multi-step reconciliation process, comparing Flags across files anchored by a Primary Key.

## Navigation & User Flow (Step-by-Step Approach)

The UI follows a "Wizard" pattern using Material Design 3 Steppers to ensure a focused, linear workflow.

### Step 1: Data Ingestion

User drags and drops 2 or more files into a central zone.

### Step 2: Schema Mapping

* Dropdown to select the **Primary Key** (Unique ID).
* Multi-select chips to identify **Flag Columns** to be audited.

### Step 3: Validation & Processing

An intermediate screen with a Linear Progress Indicator while the Web Worker runs the logic.

### Step 4: Review & Export

Interactive results table with mismatch diagnostics and a final "Export Report" action.

## Functional Requirements

### A. Logic & Comparison (Strict Matching)

* **Primary Key Anchor**: All comparisons are indexed to a single unique identifier per row.
* **Unique Flag Capture**: The engine identifies every unique Flag present across all files for a specific Key.
* **Deep Attribute Validation**: If a Flag exists in multiple files, it validates:
  * **Enable**: Strict boolean/value match.
  * **Value**: Strict character-for-character match.
  * **Expiry**: Date-only match.

### B. Expiry Date Intelligence

* **Time Stripping**: The engine MUST ignore HH:mm:ss (time-stamps) and compare only Year-Month-Day.
* **Standardization**: Automatically converts input to YYYY-MM-DD before comparison.
* **Strict Date Match**: No grace periods; any difference in the calendar date is flagged as a mismatch.

## UI/UX Requirements (Google Material 3)

### A. Full-Page Experience

* **Trigger**: Clicking the extension icon opens the dashboard in a new tab (`chrome.tabs.create`).
* **Layout**: Wide-column layout with centered surfaces to reduce eye strain.

### B. Contextual Error Tooltips (Hover Logic)

* **Interaction**: On the final "Review" table, hovering over a "Mismatch" status displays a Rich Tooltip.
* **Content**: The tooltip explicitly states the reason for the failure.
  * Example: `Mismatch: Value ("Active" vs "Inactive")`
  * Example: `Mismatch: Expiry (2026-02-12 vs 2026-05-20)`

## Technical Workflow & Stack

### Technical Stack

* **Core**: JavaScript (ES6+), Chrome Manifest V3.
* **Excel Engine**: XLSX (SheetJS).
* **UI Framework**: React + Tailwind CSS (Material 3 Tokens).
* **Date Library**: Day.js (for strict date formatting).

## Security & Privacy

* **Local Processing**: Zero data leaves the user's browser.
* **Persistence**: `chrome.storage.local` saves user-defined mapping templates for recurring audits.guys
