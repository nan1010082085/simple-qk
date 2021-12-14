import { registerMicroApps, start } from 'qiankun';
import { registerMicroAppsConfig } from './registerMicroApps';
import { BrowserLogColor as LogColor } from 'browser-log-color';
const beforeLoad = async (app) => {
    console.log('[QK] before load', app.name);
};
const beforeMount = async (app) => {
    console.log('[QK] before mount', app.name);
};
class UseApp {
    constructor({ routes, config, action }, isLogs) {
        this.useAppAction(routes, config, action, isLogs);
    }
    start(option) {
        start(option);
    }
    useAppAction($routes = [], $config = { mode: 'hash', env: 'dev' }, $action = {}, isLogs) {
        const _self = this;
        if (typeof isLogs === 'boolean' && typeof isLogs !== 'undefined') {
            _self.$logs = isLogs;
        }
        else {
            _self.$logs = $config?.env === 'dev';
        }
        if (!$routes || !$routes.length) {
            throw new Error('[QK] micro apps routes is undefined .');
        }
        if ($config.env === 'prod') {
            registerMicroAppsConfig($routes, $config);
        }
        else {
            if (!$config.devParam) {
                throw new Error('[QK] default url address not exists !');
            }
            const entryArr = [];
            for (const key in $config.devParam) {
                if (Object.prototype.hasOwnProperty.call($config.devParam, key)) {
                    const url = $config.devParam[key];
                    entryArr.push({ key, url });
                }
            }
            registerMicroAppsConfig($routes, Object.assign($config, { devParam: entryArr }));
        }
        registerMicroApps($routes, Object.assign({
            beforeLoad,
            beforeMount
        }, $action));
        if (_self.$logs) {
            LogColor.bgBlack('注册应用信息');
            console.table($routes);
        }
    }
}
export default UseApp;
