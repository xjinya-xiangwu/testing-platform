import { HTMLAttributes } from 'react';
import accessGateway from '@/assets/icons/navigation/access-gateway.svg';
import awareness from '@/assets/icons/navigation/awareness.svg';
import brandShield from '@/assets/icons/navigation/brand-shield.svg';
import dataCenter from '@/assets/icons/navigation/data-center.svg';
import rangeHall from '@/assets/icons/navigation/range-hall.svg';
import statusCompleted from '@/assets/icons/navigation/status-completed.svg';
import statusRunning from '@/assets/icons/navigation/status-running.svg';
import testTasks from '@/assets/icons/navigation/test-tasks.svg';
import trainingTasks from '@/assets/icons/navigation/training-tasks.svg';
import userSettings from '@/assets/icons/navigation/user-settings.svg';
import style from '@/components/icon-font/icon-font.module.less';

const ICONS = {
    'icon-access-gateway': accessGateway,
    'icon-awareness': awareness,
    'icon-brand-shield': brandShield,
    'icon-data-center': dataCenter,
    'icon-range-hall': rangeHall,
    'icon-status-completed': statusCompleted,
    'icon-status-running': statusRunning,
    'icon-test-tasks': testTasks,
    'icon-training-tasks': trainingTasks,
    'icon-user-settings': userSettings,
} as const;

type IconType = keyof typeof ICONS;

interface IconFontProps extends HTMLAttributes<HTMLSpanElement> {
    type: IconType;
}

const IconFont = ({ type, className, ...props }: IconFontProps) => (
    <span {...props} className={[style.icon, className].filter(Boolean).join(' ')}>
        <img src={ICONS[type]} alt="" aria-hidden="true" />
    </span>
);

export default IconFont;
