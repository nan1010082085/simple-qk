import { registerRouteConfig } from './registerRouteConfig';
class UseMicroApp {
    constructor({ version = '2', option, Vue, render, VueRouter }, isLogs) {
        const { history, routes = [], name, component, store, local = false } = option;
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
        _self.$vue = Vue;
        _self.$render = render;
        _self.$vueRouter = VueRouter;
        _self.$store = store;
        _self.$props = null;
    }
    render(appProps = {}) {
        const _self = this;
        const { container, props } = appProps;
        if (_self.$log) {
            console.log(`Init ${_self.$name} Instance ==> `, {
                dom: container,
                props
            });
        }
        _self.$props = props;
        const routeOption = registerRouteConfig(_self.$routes, {
            history: _self.$history,
            component: _self.$component,
            activeRule: _self.$activeRule,
            local: _self.$local
        });
        if (_self.$vueRouter === void 0) {
            _self.$router = null;
        }
        else {
            _self.$router = new _self.$vueRouter(routeOption);
        }
        Number(_self.$version) === 2 ? _self.v2(container, _self.$props) : _self.v3(container, _self.$props);
    }
    updateProps(props = {}) {
        const _self = this;
        if (_self.$log) {
            console.log(`Update ${_self.$name} Props =>`, props);
        }
        _self.$props = props;
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
        const _self = this;
        _self.updateProps(props);
    }
    start() {
        const _self = this;
        if (_self.$log) {
            console.log('Start Micro App', `${_self.$name} ==>`, {
                是否有主应用: window.__POWERED_BY_QIANKUN__,
                应用名称: _self.$name,
                vue版本: _self.$version,
                是否开启Log: _self.$log,
                是否允许独立运行: _self.$local,
                子应用入口: _self.$component,
                是否存在store: _self.$store ? true : false,
                是否存在路由: _self.$vueRouter ? true : false,
                路由模式: _self.$history,
                路由地址: _self.$activeRule
            });
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
        _self.$instance = new _self.$vue({
            router: _self.$router,
            store: _self.$store || null,
            render: (h) => h(_self.$render, {
                attrs: _self.$props
            })
        }).$mount(container ? container.querySelector('#app') : '#app');
    }
    v3(container, props) {
        const _self = this;
        _self.$instance = _self.$vue(_self.$render, _self.$props).use(_self.$router);
        if (_self.$store) {
            _self.$instance.use(_self.$store);
        }
        _self.$instance.mount(container ? container.querySelector('#app') : '#app');
    }
}
export default UseMicroApp;
