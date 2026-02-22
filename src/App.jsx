import { useState } from 'react';
import * as XLSX from 'xlsx';
import { parseFile, normalizeDate, normalizeValue, runAudit, detectColumnType } from './utils/auditLogic';
import { Check, AlertTriangle, Upload, FileSpreadsheet, ArrowRight, Settings, Search, RefreshCw, Download, FileWarning } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const Steps = [
    'Upload',
    'Map Schema',
    'Validate',
    'Results'
];

function App() {
    const [currentStep, setCurrentStep] = useState(0);
    const [files, setFiles] = useState([]);
    const [parsedData, setParsedData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [primaryKey, setPrimaryKey] = useState('');
    const [flags, setFlags] = useState([]); // [{ name: '', type: 'string' }]
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const handleFileUpload = async (e) => {
        const uploaded = Array.from(e.target.files);
        setFiles(uploaded);

        // Parse first file to get columns
        if (uploaded.length > 0) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const sht = wb.Sheets[wb.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sht, { header: 1 });
                if (json.length > 0) {
                    setColumns(json[0]); // First row is headers
                }
            };
            reader.readAsBinaryString(uploaded[0]);
        }

        // Parse all for processing later
        const allData = await Promise.all(uploaded.map(f => parseFile(f)));
        setParsedData(allData);
    };

    const handleRunAudit = () => {
        setIsProcessing(true);
        setCurrentStep(2);

        setTimeout(() => {
            // Processing logic
            const allKeys = new Set();
            const fileMaps = parsedData.map(dataset => {
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

            const mismatches = [];

            allKeys.forEach(key => {
                let isRowMismatch = false;
                const mismatchedCols = new Set();

                flags.forEach(flag => {
                    const colName = flag.name;
                    const vals = [];
                    fileMaps.forEach((map) => {
                        if (map.has(key)) {
                            const row = map.get(key);
                            const rawVal = row[colName];
                            const normVal = normalizeValue(rawVal, flag.type);
                            vals.push(normVal);
                        } else {
                            vals.push('__MISSING__');
                        }
                    });

                    const valid = vals.filter(v => v !== '__MISSING__');
                    if (valid.length > 1) {
                        const first = valid[0];
                        if (valid.some(v => v !== first)) {
                            isRowMismatch = true;
                            mismatchedCols.add(colName);
                        }
                    } else if (vals.includes('__MISSING__') && valid.length > 0) {
                        isRowMismatch = true;
                        mismatchedCols.add(colName);
                    }
                });

                if (isRowMismatch) {
                    const rowFiles = fileMaps.map((map) => {
                        if (map.has(key)) {
                            const row = map.get(key);
                            const filtered = {};
                            flags.forEach(f => filtered[f.name] = row[f.name]);
                            return filtered;
                        }
                        return null;
                    });

                    mismatches.push({
                        key,
                        mismatchedCols: Array.from(mismatchedCols),
                        files: rowFiles
                    });
                }
            });

            setResults(mismatches);
            setIsProcessing(false);
            setCurrentStep(3);
        }, 1500);
    };

    const handleExport = () => {
        if (results.length === 0) return;

        try {
            const exportData = [];

            // 1. Header Row
            const header = [
                `Identifier (${primaryKey})`,
                'Discrepancy in Column',
                ...files.map(f => `Value in ${f.name}`)
            ];
            exportData.push(header);

            // 2. Data Rows (One row per mismatch per key)
            results.forEach(res => {
                res.mismatchedCols.forEach(col => {
                    const row = [
                        res.key,
                        col,
                        ...res.files.map(f => f ? f[col] : 'MISSING')
                    ];
                    exportData.push(row);
                });
            });

            // 3. Create Workbook
            const ws = XLSX.utils.aoa_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Audit Discrepancies");

            // 4. Download
            XLSX.writeFile(wb, `Audit_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export report. Please check console for details.");
        }
    };

    const resetAudit = () => {
        setSearchTerm('');
        setResults([]);
        setCurrentStep(0);
        setFiles([]);
        setParsedData([]);
        setColumns([]);
        setPrimaryKey('');
        setFlags([]);
    };

    // Calculate layout classes based on step
    // If Step 3 (Results), we want a full-screen feel.
    const containerClasses = currentStep === 3
        ? "w-full h-screen flex flex-col bg-slate-50 overflow-hidden"
        : "min-h-screen bg-slate-50 flex flex-col items-center py-10";

    const mainCardClasses = currentStep === 3
        ? "flex-1 flex flex-col w-full h-full bg-white shadow-none px-6 py-4 overflow-hidden"
        : "w-full max-w-5xl bg-white rounded-xl shadow-xl p-8 min-h-[500px] flex flex-col";

    return (
        <div className={containerClasses}>

            {/* Header / Stepper (Compact in Results view) */}
            <div className={clsx("transition-all duration-300", currentStep === 3 ? "bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm shrink-0" : "w-full max-w-5xl mb-8 px-4")}>

                {currentStep !== 3 ? (
                    <>
                        <header className="mb-8 text-center">
                            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">AuditPro</h1>
                            <p className="text-slate-500">Precision Excel/CSV Reconciliation</p>
                        </header>
                        {/* Stepper */}
                        <div className="flex justify-between items-center relative">
                            {Steps.map((step, idx) => (
                                <div key={idx} className="flex flex-col items-center flex-1 relative z-10">
                                    <div className={twMerge(
                                        "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 font-semibold transition-all duration-500",
                                        idx === currentStep ? "border-blue-600 bg-blue-600 text-white shadow-lg scale-110" :
                                            idx < currentStep ? "border-green-500 bg-green-500 text-white" :
                                                "border-slate-200 bg-white text-slate-300"
                                    )}>
                                        {idx < currentStep ? <Check size={18} /> : <span>{idx + 1}</span>}
                                    </div>
                                    <span className={clsx("mt-2 text-xs md:text-sm font-medium transition-colors duration-300", idx === currentStep ? "text-blue-700" : "text-slate-400")}>
                                        {step}
                                    </span>
                                </div>
                            ))}
                            {/* Progress Bar Background */}
                            <div className="absolute top-4 md:top-5 left-0 w-full h-[2px] bg-slate-200 -z-0"></div>
                            {/* Active Progress Bar */}
                            <div
                                className="absolute top-4 md:top-5 left-0 h-[2px] bg-green-500 transition-all duration-500 -z-0"
                                style={{ width: `${(currentStep / (Steps.length - 1)) * 100}%` }}
                            ></div>
                        </div>
                    </>
                ) : (
                    // Compact Header for Results View
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                            <FileWarning size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Audit Results</h1>
                            <p className="text-xs text-slate-500">Review discrepancies below</p>
                        </div>
                    </div>
                )}
            </div>

            <main className={mainCardClasses}>

                {/* Step 1: Upload */}
                {currentStep === 0 && (
                    <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* Header Text - Hide if files selected to save space, or keep small */}
                        <div className={clsx("text-center space-y-2 mb-6", files.length > 0 ? "hidden md:block" : "block")}>
                            <h2 className="text-2xl font-bold text-slate-800">Upload Data Source</h2>
                            <p className="text-slate-500">Upload 2 or more files to verify consistency.</p>
                        </div>

                        {/* Upload Box - Shrinks when files are present */}
                        <div className={clsx(
                            "w-full border-4 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer relative group overflow-hidden",
                            files.length > 0 ? "h-32 mb-4" : "h-80"
                        )}>
                            <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={handleFileUpload} accept=".csv, .xlsx, .xls" />

                            <div className={clsx("flex items-center gap-4 transition-all", files.length > 0 ? "flex-row" : "flex-col")}>
                                <div className={clsx("bg-white rounded-full shadow-sm flex items-center justify-center transition-transform group-hover:scale-110", files.length > 0 ? "w-12 h-12" : "w-20 h-20 mb-6")}>
                                    <Upload size={files.length > 0 ? 20 : 32} className="text-blue-500" />
                                </div>
                                <div className={clsx("text-center", files.length > 0 ? "text-left" : "")}>
                                    <p className={clsx("font-semibold text-slate-700", files.length > 0 ? "text-lg" : "text-xl")}>
                                        {files.length > 0 ? "Add more files..." : "Drag & drop files here"}
                                    </p>
                                    {!files.length && <p className="text-sm text-slate-400 mt-2">or click to browse</p>}
                                </div>
                            </div>
                        </div>

                        {/* File List & Action - Appears below */}
                        {files.length > 0 && (
                            <div className="w-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                                <div className="max-h-[200px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1 custom-scrollbar">
                                    {files.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-blue-200 transition-colors shadow-sm">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 bg-green-100 text-green-700 rounded shrink-0">
                                                    <FileSpreadsheet size={18} />
                                                </div>
                                                <span className="font-medium text-slate-700 truncate">{f.name}</span>
                                            </div>
                                            <button
                                                onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                                                className="p-1 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded transition-colors"
                                                title="Remove file"
                                            >
                                                <Check size={16} className="text-green-500 group-hover:hidden" />
                                                <span className="hidden group-hover:block font-bold text-xs">✕</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentStep(1)}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
                                >
                                    Proceed to Mapping <ArrowRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Mapping */}
                {currentStep === 1 && (
                    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full animate-in slide-in-from-right-8 duration-500 h-full overflow-hidden">
                        <div className="mb-6 shrink-0">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Settings className="text-blue-500" /> Schema Configuration</h2>
                            <p className="text-slate-500">Define the structure for your audit.</p>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
                            {/* Left Pane: Primary Key Selection */}
                            <div className="w-full md:w-1/3 flex flex-col gap-4 shrink-0">
                                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
                                    <label className="block text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs">1</div>
                                        Unique Identifier
                                    </label>
                                    <p className="text-xs text-blue-700 mb-3 leading-relaxed">
                                        Select the column that uniquely identifies each row (e.g., ID, Email, SKU). This key links data across all files.
                                    </p>
                                    <div className="relative">
                                        <select
                                            className="w-full p-3 pl-4 bg-white border border-blue-200 rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-shadow font-medium text-slate-700"
                                            value={primaryKey}
                                            onChange={(e) => setPrimaryKey(e.target.value)}
                                        >
                                            <option value="">Select Unique Key...</option>
                                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400">▼</div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">2</div>
                                            Audit Stats
                                        </label>
                                    </div>
                                    <ul className="space-y-3 mt-4 text-sm text-slate-600">
                                        <li className="flex justify-between border-b border-slate-200 pb-2">
                                            <span>Files Loaded:</span>
                                            <span className="font-semibold text-slate-800">{files.length}</span>
                                        </li>
                                        <li className="flex justify-between border-b border-slate-200 pb-2">
                                            <span>Total Columns:</span>
                                            <span className="font-semibold text-slate-800">{columns.length}</span>
                                        </li>
                                        <li className="flex justify-between pb-2">
                                            <span>Columns to Audit:</span>
                                            <span className="font-bold text-blue-600 text-lg">{flags.length}</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Right Pane: Column Selection Grid */}
                            <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-slate-700">Select Columns to Audit</h3>
                                        <p className="text-xs text-slate-500">Click columns to include them in the comparison.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setFlags([])}
                                            className="text-xs font-medium text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                                        >
                                            Clear All
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Select all except primary key
                                                const newFlags = columns
                                                    .filter(c => c !== primaryKey)
                                                    .map(c => {
                                                        let type = 'string';
                                                        if (parsedData.length > 0) {
                                                            const sample = parsedData[0].slice(0, 100).map(r => r[c]);
                                                            type = detectColumnType(sample);
                                                        }
                                                        return { name: c, type };
                                                    });
                                                setFlags(newFlags);
                                            }}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                        >
                                            Select All
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                        {columns.filter(c => c !== primaryKey).map(c => {
                                            const isSelected = flags.some(f => f.name === c);
                                            const flagData = flags.find(f => f.name === c);

                                            return (
                                                <div key={c}
                                                    className={clsx("relative flex flex-col rounded-lg border transition-all duration-200 group select-none",
                                                        isSelected
                                                            ? "bg-white border-blue-500 shadow-[0_2px_8px_-2px_rgba(59,130,246,0.3)] ring-1 ring-blue-500"
                                                            : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm"
                                                    )}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setFlags(flags.filter(f => f.name !== c));
                                                        } else {
                                                            let type = 'string';
                                                            if (parsedData.length > 0) {
                                                                const sample = parsedData[0].slice(0, 100).map(r => r[c]);
                                                                type = detectColumnType(sample);
                                                            }
                                                            setFlags([...flags, { name: c, type }]);
                                                        }
                                                    }}
                                                >
                                                    <div className="p-3 flex items-center justify-between gap-2 cursor-pointer">
                                                        <span className={clsx("font-medium text-sm truncate", isSelected ? "text-blue-700" : "text-slate-600")}>{c}</span>
                                                        <div className={clsx("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                                            isSelected ? "bg-blue-500 border-blue-500" : "border-slate-300 bg-slate-50"
                                                        )}>
                                                            {isSelected && <Check size={10} className="text-white" />}
                                                        </div>
                                                    </div>

                                                    {isSelected && (
                                                        <div className="px-3 pb-3 pt-0 animate-in fade-in slide-in-from-top-1 duration-200" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex items-center gap-2 bg-blue-50/50 rounded-md p-1.5 border border-blue-100">
                                                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Type</span>
                                                                <select
                                                                    className="flex-1 text-xs bg-transparent text-blue-800 font-medium outline-none cursor-pointer hover:text-blue-600"
                                                                    value={flagData.type}
                                                                    onChange={(e) => {
                                                                        const newFlags = flags.map(fl => fl.name === c ? { ...fl, type: e.target.value } : fl);
                                                                        setFlags(newFlags);
                                                                    }}
                                                                >
                                                                    <option value="string">String (Abc)</option>
                                                                    <option value="boolean">Boolean (T/F)</option>
                                                                    <option value="date">Date (Cal)</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-6 mt-2 border-t border-slate-100 shrink-0">
                            <button onClick={() => setCurrentStep(0)} className="text-slate-500 hover:text-slate-800 font-semibold px-4 py-2 rounded-lg hover:bg-slate-100 transition-all">Back to Upload</button>
                            <button
                                onClick={handleRunAudit}
                                disabled={!primaryKey || flags.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-10 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                Start Audit Process
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Processing */}
                {currentStep === 2 && (
                    <div className="flex flex-col items-center justify-center flex-1 h-full space-y-8 animate-in zoom-in duration-500">
                        <div className="relative">
                            <div className="w-24 h-24 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                                <RefreshCw size={32} className="animate-pulse" />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-bold text-slate-800">Auditing {files.length} Datasets</h3>
                            <p className="text-slate-500">Normalizing dates • Comparing strict equality • Identifying gaps</p>
                        </div>
                    </div>
                )}

                {/* Step 4: Results (Maximized View) */}
                {currentStep === 3 && (
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Toolbar */}
                        <div className="flex flex-wrap md:flex-nowrap justify-between items-center mb-4 gap-4 pb-4 border-b shrink-0">
                            <div className="relative group flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by Key or specific Value..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg border border-red-100 shadow-sm">
                                    <span className="font-bold text-lg">{results.length}</span>
                                    <span className="text-sm font-medium">Mismatches</span>
                                </div>
                                <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
                                <button className="px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium rounded-lg transition-colors flex items-center gap-2" onClick={resetAudit}>
                                    <RefreshCw size={18} /> New Audit
                                </button>
                                <button
                                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md shadow-green-500/20 flex items-center gap-2 transition-all active:scale-95"
                                    onClick={handleExport}
                                >
                                    <Download size={18} /> Export Report
                                </button>
                            </div>
                        </div>

                        {/* Table Container (Takes remaining height, approx 85% of screen) */}
                        <div className="flex-1 overflow-auto bg-white rounded-lg border border-slate-200 shadow-inner relative">
                            {results.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-50/30">
                                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                        <Check size={40} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-green-800">Perfect Match!</h3>
                                    <p className="text-green-600 mt-2">No discrepancies found across all files.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold tracking-wider sticky top-0 z-20 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-4 border-b border-r bg-slate-50 sticky left-0 z-30 w-64 text-slate-800 drop-shadow-[2px_0_2px_rgba(0,0,0,0.05)]">
                                                <div className="flex items-center gap-2">
                                                    <Settings size={14} className="text-slate-400" />
                                                    Identifier ({primaryKey})
                                                </div>
                                            </th>
                                            {files.map((f, i) => (
                                                <th key={i} className="px-6 py-4 border-b border-r min-w-[280px]">
                                                    <div className="flex items-center gap-2">
                                                        <FileSpreadsheet size={16} className="text-blue-500" />
                                                        <span className="truncate" title={f.name}>{f.name}</span>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {results
                                            .filter(res => {
                                                if (!searchTerm) return true;
                                                const s = searchTerm.toLowerCase();
                                                if (String(res.key).toLowerCase().includes(s)) return true;
                                                return res.files.some(f => f && flags.some(flag => String(f[flag.name]).toLowerCase().includes(s)));
                                            })
                                            .map((res) => (
                                                <tr key={res.key} className="hover:bg-blue-50/30 group transition-colors">
                                                    {/* Sticky Key Column */}
                                                    <td className="px-6 py-4 font-bold text-slate-800 border-r bg-white sticky left-0 z-10 group-hover:bg-blue-50/30 drop-shadow-[2px_0_2px_rgba(0,0,0,0.05)] align-top">
                                                        {res.key}
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {res.mismatchedCols.map(col => (
                                                                <span key={col} className="inline-flex px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-red-100 text-red-600 break-all">
                                                                    {col}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>

                                                    {/* File Data Columns */}
                                                    {files.map((_, idx) => {
                                                        const fileData = res.files[idx];
                                                        return (
                                                            <td key={idx} className="px-6 py-4 border-r align-top">
                                                                {fileData ? (
                                                                    <div className="space-y-2">
                                                                        {flags.map(f => {
                                                                            const val = fileData[f.name];
                                                                            const displayVal = f.type === 'date' ? normalizeDate(val) : String(val);
                                                                            const isMismatch = res.mismatchedCols.includes(f.name);

                                                                            return (
                                                                                <div key={f.name} className={clsx(
                                                                                    "flex flex-col text-xs p-2 rounded border transition-all",
                                                                                    isMismatch
                                                                                        ? "bg-red-50 border-red-200 text-red-800 shadow-sm"
                                                                                        : "bg-transparent border-transparent text-slate-500 opacity-70"
                                                                                )}>
                                                                                    <span className="text-[10px] uppercase font-bold tracking-wide opacity-50 mb-0.5">{f.name}</span>
                                                                                    <span className="font-mono text-sm break-words select-all" title={displayVal}>
                                                                                        {displayVal || <em className="text-slate-300">Empty</em>}
                                                                                    </span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-full flex items-center justify-center p-4 bg-slate-50/50 rounded-lg border-2 border-dashed border-slate-200">
                                                                        <span className="text-slate-400 italic text-sm font-medium flex items-center gap-1">
                                                                            <FileWarning size={16} /> Missing Row
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
