import { useContext } from 'react';
import { InfoContext } from '@/provider/global-provider';
import { goLogin } from '@/components/login/login-util';
import style from '@/pages/home/home.module.less';

const Home = () => {
    const { locale } = useContext(InfoContext);

    return (
        <main className={style.home}>
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
