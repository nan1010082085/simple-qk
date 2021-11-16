import * as QK from 'qiankun';
import { QKOption, UseMicroAppOption } from './typings';
import UseApp from './container';
import UseMicroApp from './microApps';

export const QKRegisterApp = (option: QKOption) => new UseApp(option);
export const QKRegisterMicroApp = (option: UseMicroAppOption) => new UseMicroApp(option);
export default QK;
