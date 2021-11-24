/**
 * @author: Yang Dongnan
 * 2021年11月17日
 */

import { RouteConfig, RegisterRouteConfigOption } from '../typings';

/**
 * 注册微应用路由
 * @param routes 路由集合
 * @param {RegisterRouteConfigOption} option
 * @returns { base: string; mode: string; routes: RouteConfig[] } routes
 */
export function registerRouteConfig(
  routes: RouteConfig[],
  option: RegisterRouteConfigOption
): { base?: string; mode?: string; history?: any; routes: any[] } {
  const { history, component, activeRule, local } = option;
  const isHash = history === 'hash' || typeof history !== 'string';
  const isVue3Router = typeof history !== 'string';
  routes.forEach((route) => {
    if (window.__POWERED_BY_QIANKUN__ && isHash) {
      route.path = `${route.path}`;
    } else {
      route.path = `/${route.path}`;
    }
  });

  const base = window.__POWERED_BY_QIANKUN__ ? `/${activeRule}/` : local;
  const common = isVue3Router
    ? {
        history: window.__POWERED_BY_QIANKUN__ ? history(`/${activeRule}/`) : history(`${local}`)
      }
    : {
        base,
        mode: history
      };
  let config = {
    ...common,
    routes
  };
  if (isHash) {
    if (!component) {
      throw new Error('[vue-router] component is undefined');
    }
    config = {
      ...common,
      routes: [
        {
          path: base,
          name: 'container',
          component,
          children: routes
        }
      ]
    };
  }

  return config;
}
