import { describe, it, expect } from 'vitest';
import { normalizeDate, normalizeValue, runAudit, detectColumnType } from './auditLogic';

describe('Audit Logic Utilities', () => {

    describe('normalizeDate', () => {
        it('should format valid date strings to YYYY-MM-DD', () => {
            expect(normalizeDate('2023-10-05T14:30:00.000Z')).toBe('2023-10-05');
            expect(normalizeDate('2023/10/05')).toBe('2023-10-05');
        });
    });

    describe('detectColumnType', () => {
        it('should detect boolean', () => {
            expect(detectColumnType(['true', 'false', 'TRUE'])).toBe('boolean');
            expect(detectColumnType(['yes', 'no', '0', '1'])).toBe('boolean');
        });

        it('should detect date', () => {
            expect(detectColumnType(['2023-01-01', '2023-05-20'])).toBe('date');
            expect(detectColumnType(['12/31/2023', '01/01/2024'])).toBe('date');
        });

        it('should fallback to string', () => {
            expect(detectColumnType(['active', 'pending', 'closed'])).toBe('string');
            expect(detectColumnType(['123', 'abc'])).toBe('string');
        });
    });

    describe('runAudit (Core Engine)', () => {
        const dataset1 = [
            { id: '1', status: 'Active', expire: '2024-01-01' },
            { id: '2', status: 'Inactive', expire: '2024-02-01' },
        ];
        const dataset2 = [
            { id: '1', status: 'Active', expire: '2024-01-01 10:00' }, // Match
            { id: '2', status: 'Active', expire: '2024-02-01' },   // Mismatch (status)
        ];

        it('should detect mismatches correctly and return row structure', () => {
            const flags = [
                { name: 'status', type: 'string' },
                { name: 'expire', type: 'date' }
            ];

            const results = runAudit([dataset1, dataset2], 'id', flags);

            // Should find 1 mismatch (id: 2)
            expect(results).toHaveLength(1);
            const row = results[0];

            expect(row.key).toBe('2');
            expect(row.mismatchedColumns).toContain('status');
            expect(row.files[0].status).toBe('Inactive'); // File 1
            expect(row.files[1].status).toBe('Active');   // File 2
        });
    });
});
