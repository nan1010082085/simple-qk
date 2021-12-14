import { RouteConfig, UseMicroAppParam } from '../typings';
import { registerRouteConfig } from './registerRouteConfig';

/**
 * @author: Yang Dongnan
 * 2021年11月17日
 */

class UseMicroApp {
  private version!: string;
  // 微应用路由模式
  private $history!: any;
  // 微应用路由集
  private $routes!: RouteConfig[];
  // 应用激活路径
  private $activeRule!: any;
  // 独立运行
  private $local!: any;
  // 微应用路由加载组件
  private $component!: any;
  private $log!: boolean;
  private $name!: string;
  private $instance: { $destroy: any; $el: any } | any = null;
  private $Vue!: any;
  private $render!: any;
  private $VueRouter!: any;
  private $store!: any;
  private $router!: any;

  constructor({ version = '2', option, Vue, VueRouter, render }: UseMicroAppParam) {
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

  // 创建vue2.x实例
  private v2(container: any) {
    this.$instance = new this.$Vue({
      router: this.$router,
      store: this.$store || null,
      render: (h: any) => h(this.$render)
    }).$mount(container ? container.querySelector('#app') : '#app');
  }

  // 创建vue3.x实例
  private v3(container: any) {
    this.$instance = this.$Vue(this.$render).use(this.$router);
    if (this.$store) {
      this.$instance.use(this.$store);
    }
    this.$instance.mount(container ? container.querySelector('#app') : '#app');
  }

  render(props: any = {}): void {
    const { container } = props;
    const routeOption: any = registerRouteConfig(this.$routes, {
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

  mount(props: any) {
    this.render(props);
  }

  unmount() {
    if (this.version === '2') {
      this.$instance.$destroy();
      this.$instance.$el.innerHTML = '';
    } else {
      this.$instance.unmount();
    }
    this.$instance = null;
    this.$router = null;
    this.$store = null;
  }

  update(props: any) {
    return Promise.resolve(props);
  }

  start() {
    if (this.$log) {
      console.log(`[start ${this.$name} app] is primary app :`, window.__POWERED_BY_QIANKUN__);
    }
    if (window.__POWERED_BY_QIANKUN__) {
      // @ts-ignore
      __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ as string;
    }
    // 独立运行时
    if (!window.__POWERED_BY_QIANKUN__) {
      this.render();
    }
  }
}

export default UseMicroApp;
