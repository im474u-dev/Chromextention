import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const outDir = 'test_data';
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
}

// Helper to write file
const writeExcel = (filename, data) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, path.join(outDir, filename));
    console.log(`Created ${filename}`);
};

// Base Data
const baseData = [
    { UserID: 'U001', Name: 'Alice Smith', IsActive: 'TRUE', Role: 'Admin', ExpiryDate: '2025-12-31' },
    { UserID: 'U002', Name: 'Bob Jones', IsActive: 'FALSE', Role: 'Editor', ExpiryDate: '2025-06-30' },
    { UserID: 'U003', Name: 'Charlie Day', IsActive: 'TRUE', Role: 'Viewer', ExpiryDate: '2026-01-15' },
    { UserID: 'U004', Name: 'Diana Prince', IsActive: 'TRUE', Role: 'Admin', ExpiryDate: '2025-11-20' },
    { UserID: 'U005', Name: 'Evan Wright', IsActive: 'FALSE', Role: 'Viewer', ExpiryDate: '2025-10-10' },
];

// 1. Base File
writeExcel('1_Base_Data.xlsx', baseData);

// 2. Exact Match (Different sorting)
const matchData = [...baseData].reverse();
writeExcel('2_Exact_Match.xlsx', matchData);

// 3. Mismatches (Values & logic)
const mismatchData = [
    { UserID: 'U001', Name: 'Alice Smith', IsActive: 'FALSE', Role: 'Admin', ExpiryDate: '2025-12-31' }, // Mismatch IsActive
    { UserID: 'U002', Name: 'Bob Jones', IsActive: 'FALSE', Role: 'Editor', ExpiryDate: '2025-06-30' },
    { UserID: 'U003', Name: 'Charlie Day', IsActive: 'TRUE', Role: 'Viewer', ExpiryDate: '2026-01-16' }, // Mismatch Date (Day)
    { UserID: 'U004', Name: 'Diana Prince', IsActive: 'TRUE', Role: 'SuperAdmin', ExpiryDate: '2025-11-20' }, // Mismatch Role
    { UserID: 'U005', Name: 'Evan Wright', IsActive: 'FALSE', Role: 'Viewer', ExpiryDate: '2025-10-10' },
];
writeExcel('3_Mismatches.xlsx', mismatchData);

// 4. Format Differences (Should Match if logic is good)
// Note: In Excel, dates are numbers usually, but here we simulate string inputs or different formats users might type.
const formatData = [
    { UserID: 'U001', Name: 'Alice Smith', IsActive: 'TRUE', Role: 'Admin', ExpiryDate: '12/31/2025' }, // MM/DD/YYYY
    { UserID: 'U002', Name: 'Bob Jones', IsActive: 'FALSE', Role: 'Editor', ExpiryDate: '2025-06-30T09:30:00' }, // ISO with time
    { UserID: 'U003', Name: 'Charlie Day', IsActive: 'true', Role: 'Viewer', ExpiryDate: '2026-01-15 00:00:00' }, // Lowercase bool + time
    { UserID: 'U004', Name: 'Diana Prince', IsActive: 'True', Role: 'Admin', ExpiryDate: '2025-11-20' }, // Title case bool
    { UserID: 'U005', Name: 'Evan Wright', IsActive: '0', Role: 'Viewer', ExpiryDate: '2025-10-10' }, // 0 for False (might mismatch if strict string)
];
writeExcel('4_Format_Variations.xlsx', formatData);

// 5. Missing / Assessment
const partialData = [
    { UserID: 'U001', Name: 'Alice Smith', IsActive: 'TRUE', Role: 'Admin', ExpiryDate: '2025-12-31' },
    // U002 Missing
    { UserID: 'U003', Name: 'Charlie Day', IsActive: 'TRUE', Role: 'Viewer', ExpiryDate: '2026-01-15' },
    // U004 Missing
    { UserID: 'U005', Name: 'Evan Wright', IsActive: 'FALSE', Role: 'Viewer', ExpiryDate: '2025-10-10' },
    { UserID: 'U006', Name: 'Frank Castle', IsActive: 'TRUE', Role: 'Guest', ExpiryDate: '2026-05-05' }, // New Row
];
writeExcel('5_Edge_Cases.xlsx', partialData);
