/**
 * @author: Yang Dongnan
 * 2021年11月17日
 */

import { QKOption } from '../typings';
import { FrameworkConfiguration, registerMicroApps, start } from 'qiankun';
import { registerMicroAppsConfig } from './registerMicroApps';

const beforeLoad = async (app: any) => {
  console.log('[QK] before load', app.name);
};

const beforeMount = async (app: any) => {
  console.log('[QK] before mount', app.name);
};

class UseApp {
  public start = (option?: FrameworkConfiguration) => start(option);

  constructor({ isMicro = false, routes, config, action }: QKOption) {
    if (!isMicro) {
      this.useAppAction(routes, config, action);
    }
  }

  useAppAction($routes: any = [], $config: any = { mode: 'hash', env: 'dev' }, $action: any = {}) {
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
  }
}

export default UseApp;
