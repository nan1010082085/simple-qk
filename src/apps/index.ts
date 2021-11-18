import { RouteConfig, UseMicroAppOption } from '../typings';
import { registerRouteConfig } from './registerRouteConfig';

/**
 * @author: Yang Dongnan
 * 2021年11月17日
 */

class UseMicroApp {
  // 微应用路由机
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

  constructor({ option, Vue, VueRouter, render }: UseMicroAppOption) {
    const { routes, name, component, store, local = false, log = true } = option;
    this.$log = log;
    this.$name = name;
    this.$routes = routes;
    this.$component = component ? component : () => import('../template/Container');
    this.$activeRule = `${name.split('-')[0]}`;
    this.$local = local ? '/' : `${name}`;
    this.$store = store;
    this.$VueRouter = VueRouter;
    this.$Vue = Vue;
    this.$render = render;
  }

  render(props = {}): void {
    const { container } = props as any;
    const routeOption: any = registerRouteConfig(this.$routes, {
      mode: 'hash',
      component: this.$component,
      activeRule: this.$activeRule,
      local: this.$local
    });
    this.$router = new this.$VueRouter(routeOption);

    this.$instance = new this.$Vue({
      router: this.$router,
      store: this.$store || null,
      render: (h: any) => h(this.$render)
    }).$mount(container ? container.querySelector('#app') : '#app');
  }

  bootstrap() {
    return Promise.resolve();
  }

  mount(props: any) {
    this.render(props);
  }

  unmount() {
    this.$instance.$destroy();
    this.$instance.$el.innerHTML = '';
    this.$instance = null;
    this.$router = null;
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
