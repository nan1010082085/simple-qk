import * as QK from 'qiankun';
import { QKOption, UseMicroAppOption } from './src/typings';
import UseMicroApp from './src/microApps';
import UseApp from './src/container';

export type QkMicroAppStateActions = QK.MicroAppStateActions;

export default QK;

export const QKRegisterApp = (option: QKOption) => new UseApp(option);

export const QKRegisterMicroApp = (option: UseMicroAppOption) => new UseMicroApp(option);
