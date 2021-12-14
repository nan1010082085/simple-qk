/**
 * @author: Yang Dongnan
 * 2021年11月17日
 */

import { FrameworkLifeCycles } from 'qiankun';

declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean | undefined;
    __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string | undefined;
    qiankunStarted?: boolean | undefined;
    __webpack_public_path__: any;
    Promise: any;
    QK: any;
  }

  namespace JSX {
    interface IntrinsicElements {
      [elem: string]: any;
    }
  }
}
export interface RoutesMicroApp {
  // 应用名称
  name: string;
  // 激活应用标识
  activeRule?: string | any;
  // 传递给子应用参数
  props?: any;
  // 默认跳转
  pathname?: string;
  // 其他
  [T: string]: any;
}

export interface CustomMicroApp {
  name: string;
  container: string;
  activeRule?: string;
  props?: any;
  [T: string]: any;
}

export interface RouteConfig {
  path: string;
  name: string;
  component: Promise<any> | any;
  children?: RouteConfig[];
}

/**
 * 注册微应用配置
 * @param {string} container 微应用节点选择器
 * @param {dev | prod} env 环境
 * @param {} devParam dev环境下设置访问绝对路径
 */
export interface MicroAppsConfigOption {
  mode: 'hash' | 'history';
  container?: string;
  env: 'dev' | 'prod';
  devParam?: { [T: string]: string }[];
}

/**
 * 注册路由路由配置参数
 * @param history 路由模式
 * @param component hash 模式下路由页面 component = () => import('...')
 * @param activeRule 微应用模式下激活路径
 * @param local 单独访问时
 */
export interface RegisterRouteConfigOption {
  history: 'hash' | 'history' | (() => void) | any;
  component: Promise<any> | (() => void);
  activeRule: string;
  local: string;
}

/**
 * 注册子应用option参数
 * @param {object} history 路由类型
 * @param {object} routes 路由列表
 * @param {object} name 注册名称， 和 package.name 一致
 * @param {object} component 注册回调组件 必填
 * @param {object} store vuex状态管理注册
 */
export interface UseMicroAppOption {
  history: 'hash' | 'history' | (() => void) | any;
  routes: any;
  name: any;
  component: any;
  store?: any;
  [T: string]: any;
}

/**
 * @param version 版本
 * @param {object} option {history 路由类型 routes 路由列表 name 注册名称， 和 package.name 一致 component 注册回调组件 必填 store vuex状态管理注册}
 * @param {object} Vue 实例
 * @param {object} VueRouter 路由实例
 * @param {object} render vue默认app组件
 */
export interface UseMicroAppParam {
  version?: string;
  option: UseMicroAppOption;
  Vue: any;
  VueRouter: any;
  render: any;
}

export interface QKOption {
  isMicro?: boolean;
  routes?: RoutesMicroApp[];
  config?: MicroAppsConfigOption;
  action?: FrameworkLifeCycles<any>;
}
