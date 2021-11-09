import { start, loadMicroApp, initGlobalState, MicroAppStateActions } from 'qiankun';
import { QKOption, UseMicroAppOption } from './src/typings';
import UseMicroApp from './src/microApps';
import UseApp from './src/container';

class QK extends UseApp {
  public start = start;
  public loadMicroApp = loadMicroApp;
  public initGlobalState: () => MicroAppStateActions = initGlobalState;
  public UseMicroApp!: any;
  constructor(option: QKOption) {
    super(option);
    if (option.isMicro) {
      this.UseMicroApp = (option: UseMicroAppOption) => new UseMicroApp(option);
    }
  }
}

window.QK = QK;
export default QK;
