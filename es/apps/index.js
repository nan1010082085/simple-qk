import { registerRouteConfig } from './registerRouteConfig';
class UseMicroApp {
    constructor({ version = '2', option, Vue, VueRouter, render }) {
        const { history, routes, name, component, store, local = false, log = true } = option;
        this.version = version;
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
    version;
    $history;
    $routes;
    $activeRule;
    $local;
    $component;
    $log;
    $name;
    $instance = null;
    $Vue;
    $render;
    $VueRouter;
    $store;
    $router;
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
        this.version === '2' ? this.v2(container) : this.v3(container);
    }
    bootstrap() {
        return Promise.resolve();
    }
    mount(props) {
        this.render(props);
    }
    unmount() {
        if (this.version === '2') {
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
            console.log(`[start ${this.$name} app] is primary app :`, window.__POWERED_BY_QIANKUN__);
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
