import { EN } from './en';
import { ZH } from './zh';

export type LocaleLanguage = 'zh-CN' | 'en-US';
export type LocaleMessages = Record<string, string>;

const Locale: Record<LocaleLanguage, LocaleMessages> = {
    'zh-CN': ZH,
    'en-US': EN,
};

export default Locale;

export const DEFAULT_LANG: LocaleLanguage = 'zh-CN';

export const isLocaleLanguage = (language: string): language is LocaleLanguage => {
    return Object.prototype.hasOwnProperty.call(Locale, language);
};
