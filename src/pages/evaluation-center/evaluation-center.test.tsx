import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import EvaluationCenter from '@/pages/evaluation-center/evaluation-center';
import { renderRangePage } from '@/test/render-range-page';

describe('evaluation center prototype', () => {
    it('keeps the prototype clearly marked as demonstration data', () => {
        renderRangePage(<EvaluationCenter />, '/evaluation');
        expect(screen.getByText('演示数据 · 非真实运行')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: '中心化托管安全评测' })).toBeInTheDocument();
    });

    it('creates an evaluation batch through the task-focused wizard', async () => {
        const user = userEvent.setup();
        renderRangePage(<EvaluationCenter />, '/evaluation?tab=create');
        await user.click(screen.getByRole('button', { name: '下一步' }));
        await user.click(screen.getByRole('button', { name: '下一步' }));
        await user.click(screen.getByRole('button', { name: '下一步' }));
        await user.click(screen.getByRole('button', { name: '下一步' }));
        await user.click(screen.getByRole('button', { name: '创建演示批次' }));
        expect(screen.getByText('EV-20260916-002')).toBeInTheDocument();
        expect(screen.getByText('待预检')).toBeInTheDocument();
    });
});
