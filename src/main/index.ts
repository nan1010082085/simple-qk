/**
 * @author: Yang Dongnan
 * 2021年11月17日
 */
import { QKOption, LoadApps } from '../typings';
import { FrameworkConfiguration, loadMicroApp, registerMicroApps, start } from 'qiankun';
import { registerMicroAppsConfig } from './registerMicroApps';
import { BrowserLogColor as LogColor } from 'browser-log-color';

const beforeLoad = async (app: any) => {
  LogColor.bgSpringGreen('[QK] before load', app.name);
};

const beforeMount = async (app: any) => {
  LogColor.bgSpringGreen('[QK] before mount', app.name);
};

class UseApp {
  constructor({ routes, config, action }: QKOption, isLogs?: boolean) {
    this.useAppAction(routes, config, action, isLogs);
  }

  // 启动
  public start(option?: FrameworkConfiguration) {
    start(option);
  }

  // 手动加载应用
  public loadApps(env: 'dev' | 'prod', app: LoadApps, isLogs?: boolean) {
    const { name, entry, container = '#load-micro-app-container', props } = app;
    if (isLogs) {
      LogColor.bgBlack(`[手动加载 ${app.name}]：`);
      console.table(app);
    }
    return loadMicroApp({
      name,
      entry: env === 'dev' ? `/${name}/` : entry,
      container,
      props
    });
  }

  private useAppAction(
    $routes: any = [],
    $config: any = { mode: 'hash', env: 'dev' },
    $action: any = {},
    isLogs: boolean | undefined
  ) {
    const _self: any = this;
    if (typeof isLogs === 'boolean' && typeof isLogs !== 'undefined') {
      _self.$logs = isLogs;
    } else {
      _self.$logs = $config?.env === 'dev';
    }
    if (!$routes || !$routes.length) {
      throw new Error('[QK] micro apps routes is undefined .');
    }

    if ($config.env === 'prod') {
      // 生产
      registerMicroAppsConfig($routes, $config);
    } else {
      // 开发环境
      if (!$config.devParam) {
        throw new Error('[QK] default url address not exists !');
      }
      const entryArr: any = [];
      for (const key in $config.devParam) {
        if (Object.prototype.hasOwnProperty.call($config.devParam, key)) {
          const url = $config.devParam[key];
          entryArr.push({ key, url });
        }
      }
      registerMicroAppsConfig($routes, Object.assign($config, { devParam: entryArr }));
    }
    // 注册微应用
    registerMicroApps(
      $routes,
      Object.assign(
        {
          beforeLoad,
          beforeMount
        },
        $action
      )
    );
    if (_self.$logs) {
      LogColor.bgBlack('注册应用信息：');
      console.table($routes);
    }
  }
}

export default UseApp;
