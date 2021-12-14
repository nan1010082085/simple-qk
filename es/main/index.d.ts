import { QKOption } from '../typings';
import { FrameworkConfiguration } from 'qiankun';
declare class UseApp {
    $logs: boolean;
    constructor({ isMicro, routes, config, action }: QKOption, isLogs: boolean);
    start(option?: FrameworkConfiguration): void;
    useAppAction($routes?: any, $config?: any, $action?: any): void;
}
export default UseApp;
