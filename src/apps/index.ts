import { UseMicroAppInstance, UseMicroAppParam } from '../typings';
import { registerRouteConfig } from './registerRouteConfig';

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
    const _self: any | UseMicroAppInstance = this;
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

  public render(appProps: any = {}): void {
    const _self: any = this;
    // 取值 挂在DOM container， 实例初始参数props
    const { container, props } = appProps;
    // 日志
    if (_self.$log) {
      console.log(`Init ${_self.$name} Instance ==> `, {
        dom: container,
        props
      });
    }
    _self.$props = props;
    const routeOption: any = registerRouteConfig(_self.$routes, {
      history: _self.$history,
      component: _self.$component,
      activeRule: _self.$activeRule,
      local: _self.$local
    });
    if (_self.$vueRouter === void 0) {
      _self.$router = null;
    } else {
      _self.$router = new _self.$vueRouter(routeOption);
    }
    Number(_self.$version) === 2 ? _self.v2(container, _self.$props) : _self.v3(container, _self.$props);
  }

  public updateProps(props: any = {}): void {
    const _self: any = this;
    if (_self.$log) {
      console.log(`Update ${_self.$name} Props =>`, props);
    }
    _self.$props = props;
  }

  public bootstrap() {
    return Promise.resolve();
  }

  public mount(props: any) {
    const _self: any = this;
    _self.render(props);
  }

  public unmount() {
    const _self: any = this;
    if (_self.$version === '2') {
      _self.$instance.$destroy();
      _self.$instance.$el.innerHTML = '';
    } else {
      _self.$instance.unmount();
    }
    _self.$instance = null;
    _self.$router = null;
    _self.$store = null;
  }

  public update(props: any) {
    const _self: any = this;
    _self.updateProps(props);
  }

  public start() {
    const _self: any = this;
    // 日志
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
      // @ts-ignore
      __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ as string;
    }
    // 独立运行时
    if (!window.__POWERED_BY_QIANKUN__) {
      _self.render();
    }
  }

  /**
   * 创建vue2.x实例
   * @param container 实例挂在dom
   * @param props 实例初始传递参数
   */
  v2(container: any, props: { [T: string]: any }) {
    const _self: any = this;
    _self.$instance = new _self.$vue({
      router: _self.$router,
      store: _self.$store || null,
      render: (h: any) =>
        h(_self.$render, {
          attrs: _self.$props
        })
    }).$mount(container ? container.querySelector('#app') : '#app');
  }

  /**
   * 创建vue3.x实例
   * @param container 实例挂在dom
   * @param props 实例初始传递参数
   */
  v3(container: any, props: { [T: string]: any }) {
    const _self: any = this;
    _self.$instance = _self.$vue(_self.$render, _self.$props).use(_self.$router);
    if (_self.$store) {
      _self.$instance.use(_self.$store);
    }
    _self.$instance.mount(container ? container.querySelector('#app') : '#app');
  }
}

export default UseMicroApp;
