import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

vi.mock('@easycode/client-detector', () => ({
    detector: {
        sendClientInfo: vi.fn(),
        sendError2: vi.fn(),
    },
}));

afterEach(() => {
    cleanup();
});
