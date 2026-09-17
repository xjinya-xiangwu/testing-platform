import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const trainingLess = readFileSync(resolve(process.cwd(), 'src/pages/training/training.module.less'), 'utf8');

describe('Training page visual contract', () => {
    it('keeps the status tabs as a contiguous dark segmented control', () => {
        const statusSegment = trainingLess.match(/\.statusFilters\s*\{([\s\S]*?)\n\}\n\n\.statusFilters \.activeFilter/)?.[1];
        expect(statusSegment).toBeDefined();
        expect(statusSegment).toMatch(/gap:\s*3px;/);
        expect(statusSegment).toMatch(/background:\s*rgb\(2 8 14 \/ 70%\);/);
        expect(statusSegment).toMatch(/button\s*\{[\s\S]*?border:\s*0;/);
        expect(trainingLess).toMatch(/\.statusFilters \.activeFilter[\s\S]*?background:\s*rgb\(142 203 255 \/ 10%\);/);
        expect(statusSegment).not.toMatch(/border-radius:\s*999px;/);
    });

    it('keeps disabled export actions visibly non-interactive', () => {
        expect(trainingLess).toMatch(/\.disabledAction\s*\{[\s\S]*?cursor:\s*not-allowed;/);
    });
});
