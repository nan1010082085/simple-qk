import { registerMicroApps, start } from 'qiankun';
import { registerMicroAppsConfig } from './registerMicroApps';
const beforeLoad = async (app) => {
    console.log('[QK] before load', app.name);
};
const beforeMount = async (app) => {
    console.log('[QK] before mount', app.name);
};
class UseApp {
    start = start;
    constructor({ isMicro = false, routes, config, action }) {
        if (!isMicro) {
            this.useAppAction(routes, config, action);
        }
    }
    useAppAction($routes = [], $config = { mode: 'hash', env: 'dev' }, $action = {}) {
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
    }
}
export default UseApp;
