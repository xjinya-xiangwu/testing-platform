import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const taskListLess = readFileSync(resolve(process.cwd(), 'src/pages/tasks/task-list.module.less'), 'utf8');
const taskWizardLess = readFileSync(resolve(process.cwd(), 'src/pages/tasks/tasks.module.less'), 'utf8');

describe('task list layout contract', () => {
    it('centers task actions and their labels inside the action column', () => {
        expect(taskListLess).toMatch(/\.taskActions\s*\{[\s\S]*?justify-content:\s*center;/);
        expect(taskListLess).toMatch(/\.taskActions\s*\{[\s\S]*?button,\s*\n\s*a\s*\{[\s\S]*?line-height:\s*1;/);
        expect(taskListLess).toMatch(/\.taskActions\s*\{[\s\S]*?button,\s*\n\s*a\s*\{[\s\S]*?box-sizing:\s*border-box;[\s\S]*?height:\s*32px;[\s\S]*?padding:\s*4px\s+9px\s+6px;/);
    });

    it('keeps wizard selection radios compact instead of stretching across the option card', () => {
        expect(taskWizardLess).toMatch(/\.selectionRadio\s*\{[\s\S]*?width:\s*14px;[\s\S]*?height:\s*14px;/);
        expect(taskWizardLess).toMatch(/\.selectionRadio\s*\{[\s\S]*?appearance:\s*none;[\s\S]*?border-radius:\s*50%;/);
    });
});
