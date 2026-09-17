// 查找url中的某个参数的值
export const getQueryString = (search: string, name: string) => {
    if (!search) return '';
    const params = new URLSearchParams(search);
    return params.get(name) || '';
};

// 判断是否在白名单
export const isInWhiteList = (url = '', list: string[] = []) => {
    const baseUrl = url.split('?')[0];
    for (const whiteApi of list) {
        if (baseUrl.endsWith(whiteApi)) {
            return true;
        }
    }
    return false;
};

// 筛选去除url中某个参数
export const filterParamsInUrl = (keys: string[]) => {
    const { origin, pathname, search } = window.location;

    if (!search) return window.location.href;
    if (!keys?.length) return window.location.href;

    const params = new URLSearchParams(search);
    const resKeys: string[] = [];
    params.forEach((value: string, key: string) => {
        if (!keys.includes(key)) {
            resKeys.push(`${key}=${value}`);
        }
    });

    return origin + pathname + (resKeys?.length ? '?' : '') + resKeys.join('&');
};

// 是否在本地开发环境
export const isDeveloping = () => {
    const ipAddressRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
    const { href } = window.location;
    if (ipAddressRegex.test(href)) return true;
    if (href.includes('localhost')) return true;
};
