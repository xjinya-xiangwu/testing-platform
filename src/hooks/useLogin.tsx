import { useCallback, useState } from 'react';
import { IGetUserRes, getUser, goLogin, loginOut } from '../components/login/login-service';
import { fetchCachedAuthUser } from '@/components/login/auth-user-cache';

const useLogin = () => {
    const [isLogin, setIsLogin] = useState<boolean>(false);
    const [userInfo, setUserInfo] = useState<IGetUserRes>({});

    const initUser = useCallback(
        async (forbidGoLoginInGetUserInfo = false) => {
            if (isLogin && userInfo.ssoUid) return;

            const data = await fetchCachedAuthUser(getUser);
            if (data) {
                setIsLogin(true);
                setUserInfo(data);
            } else if (!forbidGoLoginInGetUserInfo) {
                await goLogin('/dashboard');
            }
        },
        [isLogin, userInfo.ssoUid],
    );

    const doLoginOut = useCallback(async () => {
        const redirectUrl = await loginOut();
        if (redirectUrl) {
            setIsLogin(false);
            setUserInfo({});
            window.open(redirectUrl, '_self');
        }
    }, []);

    return {
        doLoginOut,
        initUser,
        isLogin,
        userInfo,
    };
};

export default useLogin;
