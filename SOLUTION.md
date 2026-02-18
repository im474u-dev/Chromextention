# AuditPro Chrome Extension - Solution Documentation

## 1. Project Overview

**AuditPro** is a secure, browser-based auditing tool designed to reconcile Excel and CSV files. It runs entirely on the client side (zero data egress) and allows users to compare multiple datasets anchored by a unique Row Identifier (Flag Name). It auto-detects column types and flags mismatches across files with high precision.

## 2. Technical Architecture

The solution is built as a **Chrome Extension (Manifest V3)** using a modern web stack:

* **UI Framework**: React 19 (via Vite)
* **Styling**: Tailwind CSS v4 (configured for Material 3 aesthetics)
* **Data Processing**: `xlsx` (SheetJS) for parsing, `dayjs` for date logic.
* **Build System**: Vite (optimized for Chrome Extension output).
* **Testing**: Vitest + React Testing Library.

### Key Components

* **`src/App.jsx`**: The main React application implementing the "Wizard" workflow (Upload -> Map -> Process -> Review).
* **`src/utils/auditLogic.js`**: The core "business logic" engine. It handles:
  * **File Parsing**: Converts binary Excel/CSV data to JSON.
  * **Normalization**: Strips time from dates (YYYY-MM-DD), normalizes booleans/strings.
  * **Auto-Detection**: intelligently detects column types (`Boolean`, `Date`, or `String`) based on sample data.
  * **Comparison Engine**: Groups rows by the unique Flag Name and identifies discrepancies across files.
* **`src/background.js`**: A lightweight service worker that simply opens the React app in a new tab.

## 3. Key Features implementation

* **Intelligent Auto-Detection**:
  * Automatically scans the first 100 rows of data to determine if a column is a `Date`, `Boolean`, or `String`.
  * Pre-selects the appropriate type for validation, reducing manual user configuration.
* **Strict Mode Validation**:
  * **Dates**: Ignores time components (e.g., `2023-01-01 10:00` matches `2023-01-01`).
  * **Booleans**: `TRUE`, `1`, `yes` are normalized to "true".
  * **Text**: Strict character-for-character matching.
* **Matrix Results View**:
  * Displays a side-by-side comparison table.
  * **Row Identifier**: The first column shows the unique Flag Name (Key).
  * **File Columns**: Separate columns for each file uploaded.
  * **Visual Mismatches**: Individual cells that differ are highlighted in **red** for instant identification.

## 4. Installation Guide

1. **Build the Project**:

    ```bash
    npm install
    npm run build
    ```

    This creates a `dist` folder containing the production-ready extension.

2. **Load in Chrome**:
    * Open `chrome://extensions/`.
    * Enable **Developer mode** (top right toggle).
    * Click **Load unpacked**.
    * Select the `dist` folder from this project directory.

## 5. Usage Guide

1. **Click Extension Icon**: Opens the full-screen dashboard.
2. **Step 1: Upload**: Drag & drop 2 or more Excel/CSV files. The interface automatically adapts to a compact grid layout to prevent scrolling.
3. **Step 2: Map**:
    * Select the **Row Identifier (Flag Name)** (the unique key for each row).
    * Select **Audit Columns** (data to compare).
    * *Note*: The system will automatically detect and label column types (Type: Date/Boolean/String).
4. **Step 3: Process**: The engine validates strict matches across all files.
5. **Step 4: Review**:
    * View the "Audit Results" matrix.
    * Use the Search bar to filter by **Row Identifier** or any **Value**.
    * Dates are automatically formatted (YYYY-MM-DD).
    * Look for RED highlights indicating mismatches.

## 6. Testing & Validation

### Unit Tests

The core logic is covered by unit tests. Run them with:

```bash
npm test
```

Result: `5 tests passed` (covers auto-detection, normalization, and the matrix data structure).

### Manual Testing Data

A script `generate_test_data.js` is included to generate 5 edge-case Excel files:

1. `1_Base_Data.xlsx`: Reference data.
2. `2_Exact_Match.xlsx`: Same data, different row order (Should pass).
3. `3_Mismatches.xlsx`: Contains intentional errors (Should fail).
4. `4_Format_Variations.xlsx`: Format differences (Should pass due to normalization).
5. `5_Edge_Cases.xlsx`: Missing rows (Should flag missing data).

Generate them with:

```bash
node generate_test_data.js
```

## 7. Publishing & Distribution

### Option A: Official Chrome Web Store (Recommended)

* **Cost**: One-time $5 developer registration fee (Google policy).
* **Pros**: automatic updates, public discoverability, trust.
* **Steps**:
    1. Zip the `dist` folder: `zip -r extension.zip dist/`
    2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard).
    3. "Add new item" -> Upload the zip.
    4. Fill in store listing (Screenshots, Description).

### Option B: Free "Packed" Extension (Side-loading)

* **Cost**: Free.
* **Pros**: Share with team without store.
* **Cons**: Users must enable Developer Mode; Chrome may disable non-store extensions.
* **Steps**:
    1. Open `chrome://extensions/`.
    2. Click **Pack extension**.
    3. Select your `dist` directory.
    4. Chrome generates a `.crx` file and a `.pem` (key) file.
    5. Send the `.crx` file to users. They drag-and-drop it into `chrome://extensions/` to install.

### Option C: Developer Mode (Source Sharing)

* **Cost**: Free.
* **Steps**:
    1. Send the zipped `dist` folder to users.
    2. They unzip it.
    3. Load via "Load Unpacked" (as done during development).

### Option D: Microsoft Edge Add-ons Store (Official & Free)

* **Cost**: Free (Microsoft Partner Center registration is free).
* **Pros**: Official store listing, automatic updates, works on Edge (and Chrome users can install from Edge store).
* **Steps**:
    1. Zip the `dist` folder: `zip -r extension.zip dist/`
    2. Register for a free developer account at [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/public/login).
    3. Click **Create a new extension**.
    4. Upload the `.zip` file.
    5. Fill in the store listing details (Description, Logos, Screenshots).
    6. Submit for certification (usually takes 24-48 hours).

### Pre-Publishing Checklist

* **Icons**: The project currently uses placeholder icons in `public/`. **Replace** `icon16.png`, `icon48.png`, and `icon128.png` with your actual logo (PNG format) before uploading.
* **Manifest**: Ensure `description` and `name` are final.
* **Testing**: Load the extension unpacked in Edge (`edge://extensions/` -> Developer Mode -> Load Unpacked) to verify everything looks correct.

## 8. Version Control & GitHub

To publish this source code to GitHub:

1. **Initialize Git**:

    ```bash
    git init
    ```

2. **Add Files**:

    ```bash
    git add .
    ```

    *Note: The included `.gitignore` will automatically exclude `node_modules` and `dist`.*
3. **Commit**:

    ```bash
    git commit -m "Initial commit of AuditPro Extension"
    ```

4. **Push to GitHub**:
    * Create a new repository on GitHub (e.g., `audit-pro-extension`).
    * Run the commands shown by GitHub:

        ```bash
        git remote add origin https://github.com/YOUR_USERNAME/audit-pro-extension.git
        git branch -M main
        git push -u origin main
        ```

## 9. Directory Structure

```bash
/
├── dist/                   # Production build (Load this in Chrome)
├── public/                 # Static assets (manifest.json)
├── src/
│   ├── utils/
│   │   ├── auditLogic.js   # Core comparison engine
│   │   └── auditLogic.test.js # Unit tests
│   ├── App.jsx             # Main UI Wizard
│   ├── background.js       # Extension Service Worker
│   └── index.css           # Tailwind Styles
├── generate_test_data.js   # Test data generator
├── vite.config.js          # Build configuration
└── package.json            # Dependencies
```
