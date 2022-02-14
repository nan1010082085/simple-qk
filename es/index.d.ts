import * as QK from 'qiankun';
import { QKOption, UseMicroAppParam } from './typings';
import UseApp from './main';
import UseMicroApp from './apps';
export declare const QKRegisterApp: (option: QKOption, isLogs?: boolean | undefined) => UseApp;
export declare const QKRegisterMicroApp: (option: UseMicroAppParam, isLogs?: boolean | undefined) => UseMicroApp;
export declare const Observable: (next: (v: any) => void, error?: ((e: any) => void) | undefined, complete?: (() => void) | undefined) => import("rxjs").Subscription;
export declare const start: typeof QK.start;
export default QK;
