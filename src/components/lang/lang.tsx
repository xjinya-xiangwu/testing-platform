import { useContext } from 'react';
import { InfoContext } from '@/provider/global-provider';

const localeTitleMap: { [propName: string]: string } = {
    'zh-CN': '中',
    'en-US': 'EN',
};

const Lang = () => {
    const { lang, setLocale } = useContext(InfoContext);

    const handleClick = () => {
        setLocale(lang === 'zh-CN' ? 'en-US' : 'zh-CN');
    };

    return (
        <div>
            <div className="cursor-pointer" onClick={() => handleClick()}>
                {localeTitleMap[lang]}
            </div>
        </div>
    );
};

export default Lang;
