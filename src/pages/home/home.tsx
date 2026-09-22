import { useContext } from 'react';
import { InfoContext } from '@/provider/global-provider';
import { goLogin } from '@/components/login/login-util';
import { useTheme } from '@/hooks/useTheme';
import style from '@/pages/home/home.module.less';

const Home = () => {
    const { locale } = useContext(InfoContext);
    const { theme, toggleTheme } = useTheme();

    return (
        <main className={style.home}>
            <button
                type="button"
                className={style.themeToggle}
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? locale['theme.switchLight'] : locale['theme.switchDark']}
                title={theme === 'dark' ? locale['theme.switchLight'] : locale['theme.switchDark']}
            >
                {theme === 'dark' ? '☀' : '☾'}
            </button>
            <section>
                <p>{locale['auth.login.eyebrow']}</p>
                <h1>{locale['app.brand']}</h1>
                <span>{locale['auth.login.description']}</span>
                <button type="button" onClick={() => void goLogin('/dashboard')}>
                    {locale['auth.login.submit']}
                </button>
            </section>
        </main>
    );
};

export default Home;
