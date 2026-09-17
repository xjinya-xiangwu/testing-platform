import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IconFont from '@/components/icon-font/icon-font';

describe('IconFont', () => {
    it('renders the navigation SVG as an image instead of a CSS mask block', () => {
        render(<IconFont type="icon-awareness" aria-label="态势感知图标" />);

        const icon = screen.getByLabelText('态势感知图标');
        expect(icon.querySelector('img')).toHaveAttribute('src', expect.stringContaining('awareness'));
    });
});
