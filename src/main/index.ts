/**
 * @author: Yang Dongnan
 * 2021年11月17日
 */
import { QKOption, LoadApps } from '../typings';
import { FrameworkConfiguration, loadMicroApp, registerMicroApps, start } from 'qiankun';
import { registerMicroAppsConfig } from './registerMicroApps';

const beforeLoad = async (app: any) => {
  console.log('[QK] before load', app.name);
};

const beforeMount = async (app: any) => {
  console.log('[QK] before mount', app.name);
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
    const { name, entry, container = '#load-micro-app-container', props, localFilePath } = app;
    if (isLogs) {
      console.log(`[Load Micro ${app.name}] ==>`, app);
    }
    return loadMicroApp({
      name,
      entry: env === 'dev' ? entry : `/${localFilePath || name}/`,
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
    if (!$routes) {
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
      console.log('Register Micro App ==>', $routes);
    }
  }
}

export default UseApp;
