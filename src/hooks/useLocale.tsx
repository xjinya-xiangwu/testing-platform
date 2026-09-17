import { LANG_STORE_KEY } from '@/config/storage';
import Locale, { DEFAULT_LANG, isLocaleLanguage, LocaleLanguage } from '@/locale/index';
import { useEffect, useState } from 'react';

const useLocale = () => {
    const [lang, setLang] = useState<LocaleLanguage>(DEFAULT_LANG);

    const initLang = () => {
        const langCache = localStorage.getItem(LANG_STORE_KEY);
        if (langCache && langCache !== lang && isLocaleLanguage(langCache)) {
            setLang(langCache);
        }
    };

    const setLocale = (slang: string) => {
        const curLang = isLocaleLanguage(slang) ? slang : DEFAULT_LANG;
        setLang(curLang);
        localStorage.setItem(LANG_STORE_KEY, curLang);
    };

    useEffect(() => {
        initLang();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        lang,
        locale: Locale[lang],
        setLocale,
    };
};

export default useLocale;
