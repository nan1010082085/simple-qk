import * as QK from 'qiankun';
import { QKOption, UseMicroAppOption } from './typings';
import UseApp from './main';
import UseMicroApp from './apps';
export declare const QKRegisterApp: (option: QKOption) => UseApp;
export declare const QKRegisterMicroApp: (option: UseMicroAppOption) => UseMicroApp;
export default QK;
