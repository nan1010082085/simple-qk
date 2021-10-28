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
): { base: string; mode: string; routes: RouteConfig[] } {
  const { mode, component, activeRule, local } = option;
  const base = window.__POWERED_BY_QIANKUN__ ? `/${activeRule}/` : local;
  routes.forEach((route) => {
    route.path = window.__POWERED_BY_QIANKUN__ && mode === 'hash' ? `${route.path}` : `/${route.path}`;
  });

  let config = {
    base,
    mode,
    routes
  };
  if (mode === 'hash') {
    if (!component) {
      throw new Error('[vue-router] component is undefined');
    }
    config = {
      base,
      mode,
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
