import { useContext, useState } from 'react';
import classNames from 'classnames';
import style from './login.module.less';
import { InfoContext } from '@/provider/global-provider';
import { goLogin } from '@/components/login/login-util';
import { Popover } from 'antd';

const Login = () => {
    const { userInfo, locale, loginOut } = useContext(InfoContext);
    const [open, setOpen] = useState<boolean>(false);

    if (!userInfo?.ssoUid) {
        return (
            <div className="cursor-pointer" onClick={() => void goLogin()}>
                {locale.login}
            </div>
        );
    }

    return (
        <div>
            <Popover
                open={open}
                arrow={false}
                title={<></>}
                placement={'bottom'}
                trigger={['click']}
                overlayInnerStyle={{ padding: 0, boxShadow: 'none', background: 'transparent' }}
                content={
                    <div className={classNames('bg-white mt-12 rounded-2px w-140 pb-4', style.loginMenu)}>
                        {userInfo.username && <div className={style.loginMenuUser}>{userInfo.username}</div>}
                        <div className={classNames('cursor-pointer hover:bg-grey-2 px-7 py-16', style.loginMenuQuit)} onClick={loginOut}>
                            {locale.loginout}
                        </div>
                    </div>
                }
                onOpenChange={(sopen: boolean) => setOpen(sopen)}
            >
                <div className="cursor-pointer w-32 h-32 rounded-full overflow-hidden bg-blue-6 text-white flex items-center justify-center font-bold text-base">
                    {userInfo.avatar && <img className="w-full h-full" alt="" src={userInfo.avatar} />}
                    {!userInfo.avatar && userInfo.username && <div className="flex items-center justify-center">{userInfo.username.substring(0, 1)}</div>}
                </div>
            </Popover>
        </div>
    );
};

export default Login;
