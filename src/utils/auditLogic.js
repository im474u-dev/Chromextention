import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

/**
 * Reads a File object and returns a promise resolving to an array of objects.
 * @param {File} file 
 * @returns {Promise<any[]>}
 */
export const parseFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                resolve(json);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Normalizes a date value to YYYY-MM-DD string. 
 */
export const normalizeDate = (value) => {
    if (!value) return "";
    const d = dayjs(value);
    if (d.isValid()) {
        return d.format('YYYY-MM-DD');
    }
    return String(value).trim();
};

/**
 * Normalizes values based on type.
 */
export const normalizeValue = (value, type = 'string') => {
    if (type === 'date') {
        return normalizeDate(value);
    }
    if (type === 'boolean') {
        const s = String(value).toLowerCase().trim();
        if (s === 'true' || s === 'yes' || s === '1') return 'true';
        if (s === 'false' || s === 'no' || s === '0') return 'false';
    }
    return String(value).trim();
};

/**
 * Auto-detects column type based on a sample of values.
 * @param {Array<any>} values 
 * @returns {'string'|'date'|'boolean'}
 */
export const detectColumnType = (values) => {
    let dateCount = 0;
    let boolCount = 0;
    let validCount = 0;

    const sample = values.slice(0, 100); // Check first 100 non-empty

    for (const val of sample) {
        if (!val && val !== 0 && val !== false) continue; // Skip empty
        validCount++;
        const s = String(val).toLowerCase().trim();

        // Check Boolean
        if (['true', 'false', 'yes', 'no', '0', '1'].includes(s)) {
            boolCount++;
        }

        // Check Date (simple check + dayjs)
        // Avoid treating simple numbers as dates unless huge?
        // simple numbers like 0, 1 are bools usually.
        // Dates usually have -, /, or are 4+ digits
        if ((s.includes('-') || s.includes('/') || (typeof val === 'number' && val > 20000)) && dayjs(val).isValid()) {
            dateCount++;
        }
    }

    if (validCount === 0) return 'string';

    // Heuristic: If >90% match a type, assume it.
    if (boolCount / validCount > 0.9) return 'boolean';
    if (dateCount / validCount > 0.9) return 'date';

    return 'string';
};

/**
 * Core Audit Logic
 * Returns list of Mismatched Rows with consolidated file data.
 */
export const runAudit = (datasets, primaryKey, flagColumns) => {
    const allKeys = new Set();
    const fileMaps = datasets.map(dataset => {
        const map = new Map();
        dataset.forEach(row => {
            const pkVal = String(row[primaryKey] || "").trim();
            if (pkVal) {
                map.set(pkVal, row);
                allKeys.add(pkVal);
            }
        });
        return map;
    });

    const mismatchedRows = [];

    // Iterate all unique keys
    allKeys.forEach(key => {
        let rowHasMismatch = false;
        const mismatchedColumns = [];
        const fileValues = []; // [{ fileIndex, data: { col: val } }]

        // 1. Check for mismatches across all flags
        flagColumns.forEach(flag => {
            const colName = flag.name;
            const vals = [];

            fileMaps.forEach((map, fileIndex) => {
                if (map.has(key)) {
                    const row = map.get(key);
                    const raw = row[colName];
                    const norm = normalizeValue(raw, flag.type);
                    vals.push(norm);
                } else {
                    vals.push("__MISSING__");
                }
            });

            // Check consistency (ignore missing for mismatch logic strictly? Or treat missing as mismatch?)
            // Usually missing is a mismatch.
            // But if all present match, good.
            const pivot = vals.find(v => v !== "__MISSING__");
            if (pivot !== undefined) {
                if (vals.some(v => v !== "__MISSING__" && v !== pivot)) {
                    rowHasMismatch = true;
                    mismatchedColumns.push(colName);
                }
            }
        });

        // 2. If mismatch, build row data
        if (rowHasMismatch) {
            fileMaps.forEach((map, idx) => {
                const rowData = {};
                // Only include selected flags (+ maybe key?)
                if (map.has(key)) {
                    const r = map.get(key);
                    flagColumns.forEach(f => {
                        rowData[f.name] = r[f.name];
                    });
                }
                fileValues.push(rowData);
            });

            mismatchedRows.push({
                key, // The "Unique Flag"
                mismatchedColumns,
                files: fileValues
            });
        }
    });

    return mismatchedRows;
};
