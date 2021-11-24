import * as QK from 'qiankun';
import UseApp from './main';
import UseMicroApp from './apps';
export const QKRegisterApp = (option) => new UseApp(option);
export const QKRegisterMicroApp = (option) => new UseMicroApp(option);
export default QK;
