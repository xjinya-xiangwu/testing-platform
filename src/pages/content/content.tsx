import { useContext } from 'react';
import { InfoContext } from '@/provider/global-provider';

const Content = () => {
    const { locale } = useContext(InfoContext);

    return (
        <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
            {locale.welcome}, {locale['nav.content']}
        </div>
    );
};

export default Content;
