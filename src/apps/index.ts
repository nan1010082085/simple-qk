import { BrowserLogColor as LogColor } from 'browser-log-color';
import { UseMicroAppInstance, UseMicroAppParam } from '../typings';
import { registerRouteConfig } from './registerRouteConfig';

/**
 * @author: Yang Dongnan
 * 2021年11月17日
 */

class UseMicroApp {
  constructor({ version = '2', option, Vue, VueRouter, render }: UseMicroAppParam, isLogs: boolean) {
    const { history, routes, name, component, store, local = false } = option;
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
    _self.$store = store;
    _self.$VueRouter = VueRouter;
    _self.$Vue = Vue;
    _self.$render = render;
  }

  public render(props: any = {}): void {
    const _self: any = this;
    const { container } = props;
    const routeOption: any = registerRouteConfig(_self.$routes, {
      history: _self.$history,
      component: _self.$component,
      activeRule: _self.$activeRule,
      local: _self.$local
    });
    _self.$router = new _self.$VueRouter(routeOption);
    Number(_self.$version) === 2 ? _self.v2(container) : _self.v3(container);
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
      _self.$router.$destroy();
    }
    _self.$instance = null;
    _self.$router = null;
    _self.$store = null;
  }

  public update(props: any) {
    return Promise.resolve(props);
  }

  public start() {
    const _self: any = this;
    if (_self.$log) {
      LogColor.bgBlack(`[启动 ${_self.$name} 应用]:`);
      LogColor.bgGreen(`=============[应用信息]`);
      const table = {
        是否有主应用: window.__POWERED_BY_QIANKUN__,
        应用名称: _self.$name,
        vue版本: _self.$version,
        是否开启Log: _self.$log,
        路由模式: _self.$history,
        路由地址: _self.$activeRule,
        子应用入口: _self.$component,
        是否存在store: _self.$store ? true : false
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
      _self.render();
    }
  }

  // 创建vue2.x实例
  v2(container: any) {
    const _self: any = this;
    _self.$instance = new _self.$Vue({
      router: _self.$router,
      store: _self.$store || null,
      render: (h: any) => h(_self.$render)
    }).$mount(container ? container.querySelector('#app') : '#app');
  }

  // 创建vue3.x实例
  v3(container: any) {
    const _self: any = this;
    _self.$instance = _self.$Vue(_self.$render).use(_self.$router);
    if (_self.$store) {
      _self.$instance.use(_self.$store);
    }
    _self.$instance.mount(container ? container.querySelector('#app') : '#app');
  }
}

export default UseMicroApp;
