import { useCallback, useContext } from 'react';
import { InfoContext } from '@/provider/global-provider';

type TranslationValues = Readonly<Record<string, string | number>>;

const interpolate = (template: string, values?: TranslationValues) => {
    if (!values) return template;

    return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), template);
};

const useTranslate = () => {
    const { locale } = useContext(InfoContext);

    return useCallback(
        (key: string, values?: TranslationValues) => {
            const template = locale[key] ?? key;
            return interpolate(template, values);
        },
        [locale],
    );
};

export default useTranslate;
