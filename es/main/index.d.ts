import { QKOption } from '../typings';
import { FrameworkConfiguration } from 'qiankun';
declare class UseApp {
    constructor({ routes, config, action }: QKOption, isLogs: boolean);
    start(option?: FrameworkConfiguration): void;
    private useAppAction;
}
export default UseApp;
