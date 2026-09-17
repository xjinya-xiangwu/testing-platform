import { NavLink, useLocation } from 'react-router-dom';
import Lang from '@/components/lang/lang';
import { useContext } from 'react';
import { InfoContext } from '@/provider/global-provider';
import Login from '@/components/login/login';

const Header = () => {
    const { pathname } = useLocation();

    const { locale } = useContext(InfoContext);

    return (
        <div className="fixed w-full h-64 flex items-center px-40 box-border">
            <div className="flex-1">
                <NavLink to="/" className={pathname === '/' ? 'font-bold' : ''}>
                    {locale['nav.home']}
                </NavLink>
                <NavLink to="/content" className={pathname === '/content' ? 'font-bold ml-40 inline-block' : 'ml-40 inline-block'}>
                    {locale['nav.content']}
                </NavLink>
            </div>
            <div className="flex-shrink-0 flex items-center gap-24">
                <Lang />
                <Login />
            </div>
        </div>
    );
};

export default Header;
