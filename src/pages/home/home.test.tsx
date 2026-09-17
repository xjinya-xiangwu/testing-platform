import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Home from '@/pages/home/home';
import { InfoContext } from '@/provider/global-provider';
import { ZH } from '@/locale/zh';
import { goLogin } from '@/components/login/login-util';

vi.mock('@/components/login/login-util', () => ({
    goLogin: vi.fn(),
}));

describe('SSO login fallback page', () => {
    it('lets the user retry the frontend SSO redirect', async () => {
        render(
            <InfoContext.Provider value={{ lang: 'zh-CN', locale: ZH, setLocale: vi.fn(), isLogin: false, userInfo: {}, initUser: vi.fn(), loginOut: vi.fn() }}>
                <Home />
            </InfoContext.Provider>,
        );

        await userEvent.click(screen.getByRole('button', { name: '使用 SSO 登录' }));

        expect(goLogin).toHaveBeenCalledWith('/dashboard');
    });
});
