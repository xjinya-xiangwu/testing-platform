import { Link } from 'react-router-dom';
import useTranslate from '@/hooks/useTranslate';
import style from '@/pages/route-placeholder/route-placeholder.module.less';

interface RoutePlaceholderProps {
    titleKey: string;
}

const RoutePlaceholder = ({ titleKey }: RoutePlaceholderProps) => {
    const translate = useTranslate();

    return (
        <main className={style.placeholder}>
            <Link to="/dashboard">← {translate('common.back')}</Link>
            <h1>{translate(titleKey)}</h1>
            <p>{translate('common.notReady')}</p>
        </main>
    );
};

export default RoutePlaceholder;
