export const IS_DEMO_MODE = import.meta.env.MODE === 'demo';

export const DEMO_USER = {
    userId: 'demo-admin',
    ssoUid: 'demo-admin',
    username: '原型管理员',
    nickname: '原型管理员',
    status: 'ADMIN',
} as const;
