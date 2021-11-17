import * as QK from 'qiankun';
import { QKOption, UseMicroAppOption } from './typings';
import UseApp from './main';
import UseMicroApp from './apps';

export const QKRegisterApp = (option: QKOption) => new UseApp(option);
export const QKRegisterMicroApp = (option: UseMicroAppOption) => new UseMicroApp(option);
export default QK;
