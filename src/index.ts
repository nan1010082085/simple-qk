import * as QK from 'qiankun';
import { QKOption, UseMicroAppParam } from './typings';
import UseApp from './main';
import UseMicroApp from './apps';
import subject from './common/rxjs';

/**
 * 容器注册应用集合
 * @param option 应用注册集合
 * @param isLogs 是否开启日志
 * @returns
 * @description {RoutesMicroApp[]} - option.routes 应用集合
 * @description {MicroAppsConfigOption} - option.config 配置信息
 * @description option.action qiankun registerMicroApps.action 回调函数
 */
export const QKRegisterApp = (option: QKOption, isLogs?: boolean) => new UseApp(option, isLogs);

/**
 * 子应用注册
 * @param {UseMicroAppParam} option 注册子应用参数
 * @param option.version vue版本
 * @param {object} option.option 应用注册参数集合
 * @param option.Vue vue实例
 * @param option.VueRouter vue-router实例
 * @param option.render 入口的组件
 * @param isLogs 是否开启日志
 * @returns 子应用实例对象
 * @description option.history 路由模式
 * @description option.routes vurouter集合
 * @description option.name 应用名称
 * @description option.component 路由view | 必填
 * @description option.store vuex状态实例 | 可选
 * @description option.local 是否允许独立运行 | 必填
 */
export const QKRegisterMicroApp = (option: UseMicroAppParam, isLogs?: boolean) => new UseMicroApp(option, isLogs);

/**
 * 订阅
 * @param {function} next 传播
 * @param {function} error 错误
 * @param {function} complete 完成
 * @returns
 */
export const Observable = (next: (v: any) => void, error?: (e: any) => void, complete?: () => void) => {
  return subject.subscribe({ next, error, complete });
};

export const start = QK.start;

export default QK;
