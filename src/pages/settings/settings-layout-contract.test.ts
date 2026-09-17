import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SETTINGS_STYLE_PATH = path.resolve(process.cwd(), 'src/pages/settings/settings.module.less');

describe('settings activity layout contract', () => {
    it('keeps the activity card flexible while confining vertical scrolling to its list', () => {
        const stylesheet = fs.readFileSync(SETTINGS_STYLE_PATH, 'utf8');

        expect(stylesheet).toMatch(/\.activityViewport\s*{[^}]*display:\s*flex;[^}]*height:\s*calc\(100dvh - 48px\);/);
        expect(stylesheet).toMatch(/\.activityCard\s*{[^}]*display:\s*flex;[^}]*flex:\s*1 1 0;[^}]*flex-direction:\s*column;/);
        expect(stylesheet).toMatch(/\.auditScroll\s*{[^}]*min-height:\s*0;[^}]*flex:\s*1 1 0;[^}]*overflow-y:\s*auto;/);
    });
});
