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
 * @param {string} container 微应用加载Element位置 默认id=micro-app-container
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
 * @param {any} history 路由类型
 * @param {any} routes 路由列表
 * @param {any} name 注册名称， 和 package.name 一致
 * @param {any} component 注册回调组件 必填
 * @param {any} store vuex状态管理注册
 * @param {boolean} local 是否允许独立运行
 */
export interface UseMicroAppOption {
  history: 'hash' | 'history' | (() => void) | any;
  routes: any;
  name: any;
  component: any;
  store?: any;
  local?: boolean;
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
  version?: string | number;
  option: UseMicroAppOption;
  Vue: any;
  VueRouter: any;
  render: any;
}

/**
 * 注册子应用
 * @param routes 子应用集合
 * @param {MicroAppsConfigOption} config 子应用配置项
 * @param {FrameworkLifeCycles} action 回调
 */
export interface QKOption {
  routes?: RoutesMicroApp[];
  config?: MicroAppsConfigOption;
  action?: FrameworkLifeCycles<any>;
}

/**
 * 注册子应用参数
 * @param $version VUE版本
 * @param $history 微应用路由模式
 * @param $routes 微应用路由集
 * @param $activeRule 应用激活路径
 * @param $local 独立运行
 * @param $component 微应用路由加载组件
 * @param $log 是否开启日志
 * @param $name 应用名称
 * @param $Vue vue库实例
 * @param $VueRouter 路由库实例
 * @param $instance 应用实例
 * @param $router 应用路由实例
 * @param $store 应用状态实例
 * @param $render 应用入口组件
 */
export interface UseMicroAppInstance {
  $version: string | number;
  $history: any;
  $routes: RouteConfig[];
  $activeRule: any;
  $local: boolean;
  $component: any;
  $log: boolean;
  $name: string;
  $instance: { $destroy: any; $el: any } | any;
  $Vue: any;
  $VueRouter: any;
  $render: any;
  $store: any;
  $router: any;
}

/**
 * 手动加载应用
 * @param name 应用名称 prod环境下为entry入口
 * @param entry 应用入口地址
 * @param container 应用加载Element位置 默认id=load-micro-app-container
 * @param props 应用参数
 */
export interface LoadApps {
  name: string;
  entry: string;
  container: string;
  props?: any;
}
