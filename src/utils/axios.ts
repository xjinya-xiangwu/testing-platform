import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { message } from 'antd';
import { detector } from '@easycode/client-detector';
import { LANG_STORE_KEY } from '@/config/storage';
import Locale, { DEFAULT_LANG, isLocaleLanguage, LocaleLanguage } from '@/locale/index';
import { clearCachedAuthUser } from '@/components/login/auth-user-cache';

let isLoginRedirectPending = false;

const redirectToLogin = async () => {
    try {
        const { goLogin } = await import('@/components/login/login-service');
        const isRedirectStarted = await goLogin();
        if (!isRedirectStarted) isLoginRedirectPending = false;
    } catch {
        isLoginRedirectPending = false;
    }
};

const scheduleLoginRedirect = () => {
    if (isLoginRedirectPending) return;
    isLoginRedirectPending = true;
    clearCachedAuthUser();
    setTimeout(() => {
        void redirectToLogin();
    }, 200);
};

interface IMyResponse<T> {
    msg: string;
    code?: number | string;
    requestId?: string;
    success?: boolean;
    data: T;
}

interface IMyCustomConfig {
    forbidMsg?: boolean; // 是否屏蔽消息
    timeout?: number; // 接口timeout
    forbidCheckLogin?: boolean; // 是否禁止检查登录
}

type IResquestOptions<U> = {
    data?: U; // post传参
    params?: U; // get传参
};

type IMyRequest<U> = AxiosRequestConfig & IMyCustomConfig & IResquestOptions<U>;

type IMyRequestConfig = IMyCustomConfig & InternalAxiosRequestConfig;

class Http {
    timeout = 7000;
    baseURL = '';
    private axiosInstance: AxiosInstance;

    getCurLang(): LocaleLanguage {
        const cache = localStorage.getItem(LANG_STORE_KEY) || '';
        return isLocaleLanguage(cache) ? cache : DEFAULT_LANG;
    }

    getCurLocale() {
        return Locale[this.getCurLang()];
    }

    constructor() {
        this.axiosInstance = axios.create({
            withCredentials: true,
        });
        this.setInterceptor(this.axiosInstance);
    }

    mergeOptions(options: AxiosRequestConfig) {
        return {
            timeout: this.timeout,
            baseURL: this.baseURL,
            ...options,
        };
    }

    setInterceptor(instance: AxiosInstance) {
        instance.interceptors.request.use((config: IMyRequestConfig) => {
            const exConfig: IMyRequestConfig = Object.assign(config, {});

            // header塞入语言类型，方便后台返回对应的msg
            if (exConfig?.headers) {
                exConfig.headers['accept-language'] = this.getCurLang();
            }

            return exConfig;
        });
        instance.interceptors.response.use(
            (res: AxiosResponse & { config: IMyRequestConfig }) => {
                if (res.status === 200) {
                    if (res.data?.success === undefined && res.data?.code === undefined) {
                        return Promise.resolve({
                            code: 0,
                            data: res.data,
                            msg: '',
                            success: true,
                        });
                    }

                    const ifFail = res?.data?.success !== undefined ? !res.data.success : res.data.code !== 0;
                    if (ifFail) {
                        if (!res?.config?.forbidMsg) {
                            message.error(res.data?.msg); // 注意中英文，如果要用msg，需要后台返回对应语言的msg
                        }
                        return Promise.resolve(res.data);
                    }
                    return Promise.resolve(res.data);
                } else {
                    try {
                        const resp = res.data;
                        if (resp && resp.code !== 0) {
                            const err = new Error(JSON.stringify(resp));
                            detector.sendError2(err, res.request.responseURL);
                        }
                    } catch (err) {
                        detector.sendError2(err as Error, res.request.responseURL);
                    }
                }
                return Promise.resolve(res.data);
            },
            (err: AxiosError & { config: IMyRequestConfig }) => {
                const responseData = err?.response?.data;
                const backendError = responseData && typeof responseData === 'object' && !Array.isArray(responseData) ? (responseData as Record<string, unknown>) : {};
                try {
                    const error = new Error(JSON.stringify(responseData));
                    detector.sendError2(error, err.request.responseURL);
                } catch (error) {
                    detector.sendError2(error as Error, err.request.responseURL);
                }

                const status = err?.response?.status;
                const locale = this.getCurLocale();

                if (!err?.config?.forbidMsg) {
                    if (status === 401 && !err?.config?.forbidCheckLogin) {
                        message.warning(locale?.['err.overdue']);
                    } else {
                        message.warning(err?.message || locale?.['err.fail']);
                    }
                }

                if (status === 401 && !err?.config?.forbidCheckLogin) {
                    scheduleLoginRedirect();
                }

                return Promise.resolve({
                    code: typeof backendError.code === 'string' || typeof backendError.code === 'number' ? backendError.code : 9999,
                    data: null,
                    msg: typeof backendError.message === 'string' ? backendError.message : err.message || locale?.['err.fail'],
                    ...(typeof backendError.request_id === 'string' ? { requestId: backendError.request_id } : {}),
                });
            },
        );
    }

    request<U, T>(options: IMyRequest<U>): Promise<IMyResponse<T>> {
        const opts = this.mergeOptions(options);
        return this.axiosInstance(opts);
    }

    get<U, T>(url: string, config: IMyRequest<U> = {}): Promise<IMyResponse<T>> {
        return this.request<U, T>({
            url,
            method: 'get',
            ...config,
        });
    }

    post<U, T>(url: string, config: IMyRequest<U> = {}): Promise<IMyResponse<T>> {
        return this.request<U, T>({
            url,
            method: 'post',
            ...config,
        });
    }

    put<U, T>(url: string, config: IMyRequest<U> = {}): Promise<IMyResponse<T>> {
        return this.request<U, T>({
            url,
            method: 'put',
            ...config,
        });
    }

    delete<U, T>(url: string, config: IMyRequest<U> = {}): Promise<IMyResponse<T>> {
        return this.request<U, T>({
            url,
            method: 'delete',
            ...config,
        });
    }
}

export default new Http();
