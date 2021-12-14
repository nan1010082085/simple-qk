import * as QK from 'qiankun';
import { QKOption, UseMicroAppParam } from './typings';
import UseApp from './main';
import UseMicroApp from './apps';
export declare const QKRegisterApp: (option: QKOption) => UseApp;
export declare const QKRegisterMicroApp: (option: UseMicroAppParam) => UseMicroApp;
export default QK;
