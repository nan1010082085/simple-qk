import { BrowserLogColor as LogColor } from 'browser-log-color';
import { registerRouteConfig } from './registerRouteConfig';
class UseMicroApp {
    constructor({ version = '2', option, Vue, VueRouter, render }, isLogs) {
        const { history, routes, name, component, store, local = false } = option;
        if (!component) {
            throw new Error('component is not define');
        }
        const _self = this;
        _self.$version = version;
        _self.$log = isLogs;
        _self.$name = name;
        _self.$history = history;
        _self.$routes = routes;
        _self.$component = component;
        _self.$activeRule = `${name.split('-')[0]}`;
        _self.$local = local ? '/' : `${name}`;
        _self.$store = store;
        _self.$VueRouter = VueRouter;
        _self.$Vue = Vue;
        _self.$render = render;
    }
    render(appProps = {}) {
        const _self = this;
        const { container, props } = appProps;
        if (_self.$log) {
            const table = {
                实例DOM: container,
                实例参数: props
            };
            console.table(table);
        }
        const routeOption = registerRouteConfig(_self.$routes, {
            history: _self.$history,
            component: _self.$component,
            activeRule: _self.$activeRule,
            local: _self.$local
        });
        _self.$router = new _self.$VueRouter(routeOption);
        Number(_self.$version) === 2 ? _self.v2(container, props) : _self.v3(container, props);
    }
    bootstrap() {
        return Promise.resolve();
    }
    mount(props) {
        const _self = this;
        _self.render(props);
    }
    unmount() {
        const _self = this;
        if (_self.$version === '2') {
            _self.$instance.$destroy();
            _self.$instance.$el.innerHTML = '';
        }
        else {
            _self.$instance.unmount();
        }
        _self.$instance = null;
        _self.$router = null;
        _self.$store = null;
    }
    update(props) {
        return Promise.resolve(props);
    }
    start() {
        const _self = this;
        if (_self.$log) {
            LogColor.bgBlack(`[启动应用 ${_self.$name}]:`);
            const table = {
                是否有主应用: window.__POWERED_BY_QIANKUN__,
                应用名称: _self.$name,
                vue版本: _self.$version,
                是否开启Log: _self.$log,
                路由模式: _self.$history,
                路由地址: _self.$activeRule,
                子应用入口: _self.$component,
                是否存在store: _self.$store ? true : false,
                是否允许独立运行: _self.$local
            };
            console.table(table);
        }
        if (window.__POWERED_BY_QIANKUN__) {
            __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
        }
        if (!window.__POWERED_BY_QIANKUN__) {
            _self.render();
        }
    }
    v2(container, props) {
        const _self = this;
        _self.$instance = new _self.$Vue({
            router: _self.$router,
            store: _self.$store || null,
            props,
            render: (h) => h(_self.$render)
        }).$mount(container ? container.querySelector('#app') : '#app');
    }
    v3(container, props) {
        const _self = this;
        _self.$instance = _self.$Vue(_self.$render, props).use(_self.$router);
        if (_self.$store) {
            _self.$instance.use(_self.$store);
        }
        _self.$instance.mount(container ? container.querySelector('#app') : '#app');
    }
}
export default UseMicroApp;
