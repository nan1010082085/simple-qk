import { UseMicroAppInstance, UseMicroAppParam } from '../typings';
import { registerRouteConfig } from './registerRouteConfig';
import subject from '../common/rxjs';

/**
 * @author: Yang Dongnan
 * 2021年11月17日
 */

class UseMicroApp {
  constructor({ version = '2', option, Vue, render, VueRouter }: UseMicroAppParam, isLogs?: boolean) {
    const { history, routes = [], name, component, store, local = false } = option;
    if (!component) {
      throw new Error('component is not define');
    }
    const self: any | UseMicroAppInstance = this;
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
    self.$store = store;
  }

  public render(appProps: any = {}): void {
    const self: any = this;
    // 取值 挂在DOM container， 实例初始参数props
    const { container, props = {} } = appProps;
    // 设置路由
    const routeOption: any = registerRouteConfig(self.$routes, {
      history: self.$history,
      component: self.$component,
      activeRule: self.$activeRule,
      local: self.$local
    });
    if (self.$vueRouter === void 0) {
      self.$router = null;
    } else {
      self.$router = new self.$vueRouter(routeOption);
    }
    // 日志
    if (self.$log) {
      console.log(`Init ${self.$name} Instance ==> `, {
        dom: container,
        props
      });
    }
    Number(self.$version) === 2 ? self.v2(container, props) : self.v3(container, props);
  }

  public updateProps(updateProps: any = {}): void {
    const { props = {} } = updateProps;
    const self: any = this;
    // 日志
    if (self.$log) {
      console.log(`Update ${self.$name} Props =>`, props);
    }
    subject.next(props);
  }

  public bootstrap() {
    return Promise.resolve();
  }

  public mount(props: any) {
    const self: any = this;
    self.render(props);
  }

  public unmount() {
    const self: any = this;
    if (self.$version === '2') {
      self.instance.$destroy();
      self.instance.$el.innerHTML = '';
    } else {
      self.instance.unmount();
    }
    self.instance = null;
    self.$router = null;
    self.$store = null;
  }

  public update(props: any) {
    const self: any = this;
    self.updateProps(props);
  }

  public start() {
    const self: any = this;
    if (window.__POWERED_BY_QIANKUN__) {
      // @ts-ignore
      __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ as string;
    }
    // 独立运行时
    if (!window.__POWERED_BY_QIANKUN__) {
      self.render();
    }
    // 日志
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

  /**
   * 创建vue2.x实例
   * @param container 实例挂在dom
   * @param provide 实例初始传递参数
   * @param props 实例初始传递参数
   */
  protected v2(container: any, props: any) {
    const self: any = this;
    self.instance = new self.$vue({
      router: self.$router,
      store: self.$store || null,
      render: (h: any) => h(self.app)
    });
    self.instance.$mount(container ? container.querySelector('#app') : '#app');
    subject.next(props);
  }

  /**
   * 创建vue3.x实例
   * @param container 实例挂在dom
   * @param props 实例初始传递参数
   */
  protected v3(container: any, props: any) {
    const self: any = this;
    self.instance = self.$vue(self.app);
    if (self.$router) {
      self.instance.use(self.$router);
    }
    if (self.$store) {
      self.instance.use(self.$store);
    }
    self.instance.mount(container ? container.querySelector('#app') : '#app');
    subject.next(props);
  }
}

export default UseMicroApp;
