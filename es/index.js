import * as QK from 'qiankun';
import UseApp from './main';
import UseMicroApp from './apps';
export const QKRegisterApp = (option, isLogs) => new UseApp(option, isLogs);
export const QKRegisterMicroApp = (option) => new UseMicroApp(option);
export default QK;
