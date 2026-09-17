import { FormEvent, useState } from 'react';
import useDialogFocus from '@/hooks/useDialogFocus';
import style from '@/pages/gateway/gateway.module.less';
import type { IApiToken } from '@/api/api-tokens';

interface TranslateProps {
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

interface GatewayCreateTokenDialogProps extends TranslateProps {
    errorMessage: string | null;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (name: string) => void;
}

export const GatewayCreateTokenDialog = ({ errorMessage, isSubmitting, onClose, onSubmit, translate }: GatewayCreateTokenDialogProps) => {
    const [name, setName] = useState('');
    const dialogRef = useDialogFocus<HTMLElement>(true, onClose);
    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit(name);
    };

    return (
        <div className={style.dialogBackdrop}>
            <section ref={dialogRef} className={style.dialog} role="dialog" aria-modal="true" aria-labelledby="gateway-create-title" tabIndex={-1}>
                <form onSubmit={handleSubmit}>
                    <header className={style.dialogHeader}>
                        <div>
                            <h2 id="gateway-create-title">{translate('gateway.keys.createDialog.title')}</h2>
                            <p>{translate('gateway.keys.createDialog.description')}</p>
                        </div>
                        <button type="button" aria-label={translate('common.close')} onClick={onClose}>
                            ×
                        </button>
                    </header>
                    <label className={style.dialogField}>
                        <span>{translate('gateway.keys.name')}</span>
                        <input value={name} maxLength={128} autoComplete="off" onChange={(event) => setName(event.target.value)} />
                    </label>
                    {errorMessage ? (
                        <p className={style.inlineError} role="alert">
                            {errorMessage}
                        </p>
                    ) : null}
                    <footer className={style.dialogFooter}>
                        <button type="button" className={style.secondaryButton} onClick={onClose}>
                            {translate('common.cancel')}
                        </button>
                        <button type="submit" className={style.primaryButton} disabled={isSubmitting || !name.trim()}>
                            {translate('gateway.keys.createSubmit')}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
};

interface GatewayTokenSecretDialogProps extends TranslateProps {
    onClose: () => void;
    token: string;
}

export const GatewayTokenSecretDialog = ({ onClose, token, translate }: GatewayTokenSecretDialogProps) => {
    const dialogRef = useDialogFocus<HTMLElement>(true, onClose);
    return (
        <div className={style.dialogBackdrop}>
            <section ref={dialogRef} className={style.dialog} role="dialog" aria-modal="true" aria-labelledby="gateway-secret-title" tabIndex={-1}>
                <header className={style.dialogHeader}>
                    <div>
                        <h2 id="gateway-secret-title">{translate('gateway.keys.secretDialog.title')}</h2>
                        <p>{translate('gateway.keys.secretDialog.description')}</p>
                    </div>
                </header>
                <code className={style.secretValue}>{token}</code>
                <footer className={style.dialogFooter}>
                    <button type="button" className={style.primaryButton} onClick={onClose}>
                        {translate('gateway.keys.secretDialog.saved')}
                    </button>
                </footer>
            </section>
        </div>
    );
};

interface GatewayRevokeTokenDialogProps extends TranslateProps {
    isSubmitting: boolean;
    onClose: () => void;
    onConfirm: () => void;
    token: IApiToken;
}

export const GatewayRevokeTokenDialog = ({ isSubmitting, onClose, onConfirm, token, translate }: GatewayRevokeTokenDialogProps) => {
    const dialogRef = useDialogFocus<HTMLElement>(true, onClose);
    return (
        <div className={style.dialogBackdrop}>
            <section ref={dialogRef} className={style.dialog} role="dialog" aria-modal="true" aria-labelledby="gateway-revoke-title" tabIndex={-1}>
                <header className={style.dialogHeader}>
                    <div>
                        <h2 id="gateway-revoke-title">{translate('gateway.keys.revokeDialog.title')}</h2>
                        <p>{translate('gateway.keys.revokeDialog.description', { name: token.name, prefix: token.keyPrefix })}</p>
                    </div>
                </header>
                <footer className={style.dialogFooter}>
                    <button type="button" className={style.secondaryButton} onClick={onClose}>
                        {translate('common.cancel')}
                    </button>
                    <button type="button" className={style.dangerButton} disabled={isSubmitting} onClick={onConfirm}>
                        {translate('gateway.keys.revokeDialog.confirm')}
                    </button>
                </footer>
            </section>
        </div>
    );
};
