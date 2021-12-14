import * as QK from 'qiankun';
import { QKOption, UseMicroAppParam } from './typings';
import UseApp from './main';
import UseMicroApp from './apps';

export const QKRegisterApp = (option: QKOption, isLogs: boolean) => new UseApp(option, isLogs);
export const QKRegisterMicroApp = (option: UseMicroAppParam) => new UseMicroApp(option);
export default QK;
