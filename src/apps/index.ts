import { BrowserLogColor as LogColor } from 'browser-log-color';
import { RouteConfig, UseMicroAppParam } from '../typings';
import { registerRouteConfig } from './registerRouteConfig';

/**
 * @author: Yang Dongnan
 * 2021年11月17日
 */

class UseMicroApp {
  private $version: string | number = '2';
  // 微应用路由模式
  private $history: any = 'hash';
  // 微应用路由集
  private $routes: RouteConfig[] = [];
  // 应用激活路径
  private $activeRule: any = '';
  // 独立运行
  private $local: any = true;
  // 微应用路由加载组件
  private $component: any = '';
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

  public render(props: any = {}): void {
    const { container } = props;
    const routeOption: any = registerRouteConfig(this.$routes, {
      history: this.$history,
      component: this.$component,
      activeRule: this.$activeRule,
      local: this.$local
    });
    this.$router = new this.$VueRouter(routeOption);
    Number(this.$version) === 2 ? this.v2(container) : this.v3(container);
  }

  public bootstrap() {
    return Promise.resolve();
  }

  public mount(props: any) {
    this.render(props);
  }

  public unmount() {
    if (this.$version === '2') {
      this.$instance.$destroy();
      this.$instance.$el.innerHTML = '';
    } else {
      this.$instance.unmount();
      this.$router.$destroy();
    }
    this.$instance = null;
    this.$router = null;
    this.$store = null;
  }

  public update(props: any) {
    return Promise.resolve(props);
  }

  public start() {
    if (this.$log) {
      LogColor.bgBlack(`[启动 ${this.$name} 应用]:`);
      LogColor.bgGreen(`=============[应用信息]`);
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
      LogColor.bgGreen(`=============[应用信息]`);
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
}

export default UseMicroApp;
