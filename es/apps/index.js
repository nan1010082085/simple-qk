import { registerRouteConfig } from './registerRouteConfig';
import subject from '../common/rxjs';
class UseMicroApp {
    constructor({ version = '2', option, Vue, render, VueRouter }, isLogs) {
        const { history, routes = [], name, component, store, local = false } = option;
        if (!component) {
            throw new Error('component is not define');
        }
        const self = this;
        self.$version = version;
        self.$log = isLogs;
        self.$name = name;
        self.$history = history;
        self.$routes = routes;
        self.$component = component;
        self.$activeRule = `${name.split('-')[0]}`;
        self.$local = local ? '/' : `${name}`;
        self.$vue = Vue;
        self.app = render;
        self.$vueRouter = VueRouter;
        self.$props = null;
        self.instance = null;
        self.router = null;
        self.$store = store;
    }
    render(appProps = {}) {
        const self = this;
        const { container, props = {} } = appProps;
        const routeOption = registerRouteConfig(self.$routes, {
            history: self.$history,
            component: self.$component,
            activeRule: self.$activeRule,
            local: self.$local
        });
        if (self.$vueRouter === void 0) {
            self.$router = null;
        }
        else {
            self.$router = new self.$vueRouter(routeOption);
        }
        if (self.$log) {
            console.log(`Init ${self.$name} Instance ==> `, {
                dom: container,
                props: self.$props
            });
        }
        self.$props = props;
        Number(self.$version) === 2 ? self.v2(container) : self.v3(container);
    }
    updateProps(updateProps = {}) {
        const { props = {} } = updateProps;
        const self = this;
        if (self.$log) {
            console.log(`Update ${self.$name} Props =>`, props);
        }
        self.$props = Object.assign(self.$props, props);
        subject.next(self.$props);
    }
    bootstrap() {
        return Promise.resolve();
    }
    mount(props) {
        const self = this;
        self.render(props);
    }
    unmount() {
        const self = this;
        if (self.$version === '2') {
            self.instance.$destroy();
            self.instance.$el.innerHTML = '';
        }
        else {
            self.instance.unmount();
        }
        self.instance = null;
        self.$router = null;
        self.$store = null;
    }
    update(props) {
        const self = this;
        self.updateProps(props);
    }
    start() {
        const self = this;
        if (window.__POWERED_BY_QIANKUN__) {
            __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
        }
        if (!window.__POWERED_BY_QIANKUN__) {
            self.render();
        }
        if (self.$log) {
            console.log('Start Micro App', `${self.$name} ==>`, {
                是否有主应用: window.__POWERED_BY_QIANKUN__,
                应用名称: self.$name,
                vue版本: self.$version,
                是否开启Log: self.$log,
                是否允许独立运行: self.$local,
                子应用入口: self.$component,
                是否存在store: self.$store ? true : false,
                是否存在路由: self.$vueRouter ? true : false,
                路由模式: self.$history,
                路由地址: self.$activeRule
            });
        }
    }
    v2(container) {
        const self = this;
        self.instance = new self.$vue({
            router: self.$router,
            store: self.$store || null,
            render: (h) => h(self.app)
        });
        self.instance.$mount(container ? container.querySelector('#app') : '#app');
        subject.next(self.$props);
    }
    v3(container) {
        const self = this;
        self.instance = self.$vue(self.app);
        if (self.$router) {
            self.instance.use(self.$router);
        }
        if (self.$store) {
            self.instance.use(self.$store);
        }
        self.instance.mount(container ? container.querySelector('#app') : '#app');
        subject.next(self.$props);
    }
}
export default UseMicroApp;
