import { QKOption, LoadApps } from '../typings';
import { FrameworkConfiguration } from 'qiankun';
declare class UseApp {
    constructor({ routes, config, action }: QKOption, isLogs?: boolean);
    start(option?: FrameworkConfiguration): void;
    loadApps(env: 'dev' | 'prod', app: LoadApps, isLogs?: boolean): import("qiankun").MicroApp;
    private useAppAction;
}
export default UseApp;
