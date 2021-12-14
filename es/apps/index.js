import { BrowserLogColor as LogColor } from 'browser-log-color';
import { registerRouteConfig } from './registerRouteConfig';
class UseMicroApp {
    $version = '2';
    $history = 'hash';
    $routes = [];
    $activeRule = '';
    $local = true;
    $component = '';
    $log;
    $name;
    $instance = null;
    $Vue;
    $render;
    $VueRouter;
    $store;
    $router;
    constructor({ version = '2', option, Vue, VueRouter, render }) {
        const { history, routes, name, component, store, local = false, log = true } = option;
        if (!component) {
            throw new Error('component is not define');
        }
        this.$version = version;
        this.$log = log;
        this.$name = name;
        this.$history = history;
        this.$routes = routes;
        this.$component = component;
        this.$activeRule = `${name.split('-')[0]}`;
        this.$local = local ? '/' : `${name}`;
        this.$store = store;
        this.$VueRouter = VueRouter;
        this.$Vue = Vue;
        this.$render = render;
    }
    v2(container) {
        this.$instance = new this.$Vue({
            router: this.$router,
            store: this.$store || null,
            render: (h) => h(this.$render)
        }).$mount(container ? container.querySelector('#app') : '#app');
    }
    v3(container) {
        this.$instance = this.$Vue(this.$render).use(this.$router);
        if (this.$store) {
            this.$instance.use(this.$store);
        }
        this.$instance.mount(container ? container.querySelector('#app') : '#app');
    }
    render(props = {}) {
        const { container } = props;
        const routeOption = registerRouteConfig(this.$routes, {
            history: this.$history,
            component: this.$component,
            activeRule: this.$activeRule,
            local: this.$local
        });
        this.$router = new this.$VueRouter(routeOption);
        Number(this.$version) === 2 ? this.v2(container) : this.v3(container);
    }
    bootstrap() {
        return Promise.resolve();
    }
    mount(props) {
        this.render(props);
    }
    unmount() {
        if (this.$version === '2') {
            this.$instance.$destroy();
            this.$instance.$el.innerHTML = '';
        }
        else {
            this.$instance.unmount();
            this.$router.$destroy();
        }
        this.$instance = null;
        this.$router = null;
        this.$store = null;
    }
    update(props) {
        return Promise.resolve(props);
    }
    start() {
        if (this.$log) {
            LogColor.bgBlack(`[start ${this.$name} app] is primary app :`, window.__POWERED_BY_QIANKUN__);
            LogColor.bgGreen(`=============[app info start]`);
            const table = {
                是否有主应用: window.__POWERED_BY_QIANKUN__,
                应用名称: this.$name,
                vue版本: this.$version,
                是否开启Log: this.$log,
                路由模式: this.$history,
                路由地址: this.$activeRule,
                子应用入口: this.$component,
                是否存在store: this.$store ? true : false
            };
            console.table(table);
            LogColor.bgGreen(`=============[app info end]`);
        }
        if (window.__POWERED_BY_QIANKUN__) {
            __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
        }
        if (!window.__POWERED_BY_QIANKUN__) {
            this.render();
        }
    }
}
export default UseMicroApp;
