import {
  start,
  loadMicroApp,
  prefetchApps,
  initGlobalState,
  MicroAppStateActions,
  addGlobalUncaughtErrorHandler,
  removeGlobalUncaughtErrorHandler
} from 'qiankun';
import { QKOption, UseMicroAppOption } from './src/typings';
import UseMicroApp from './src/microApps';
import UseApp from './src/container';

export type QkMicroAppStateActions = MicroAppStateActions;

export {
  start,
  initGlobalState,
  loadMicroApp,
  prefetchApps,
  addGlobalUncaughtErrorHandler,
  removeGlobalUncaughtErrorHandler
};

export default class QK extends UseApp {
  public UseMicroApp!: any;
  public start = start;
  constructor(option: QKOption) {
    super(option);
    if (option.isMicro) {
      this.UseMicroApp = (option: UseMicroAppOption) => new UseMicroApp(option);
    }
  }
}
