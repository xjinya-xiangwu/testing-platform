import { ReactNode } from 'react';
import style from '@/pages/dashboard/dashboard.module.less';

interface DashboardCardProps {
    children: ReactNode;
    subtitle?: string;
    title: string;
}

const DashboardCard = ({ children, subtitle, title }: DashboardCardProps) => {
    return (
        <section className={style.card} aria-label={title}>
            <header className={style.cardHeader}>
                <h2>{title}</h2>
                {subtitle && <span>{subtitle}</span>}
            </header>
            {children}
        </section>
    );
};

export default DashboardCard;
