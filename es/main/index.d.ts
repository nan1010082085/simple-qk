import { QKOption } from '../typings';
import { FrameworkConfiguration } from 'qiankun';
declare class UseApp {
    constructor({ isMicro, routes, config, action }: QKOption);
    start(option?: FrameworkConfiguration): void;
    useAppAction($routes?: any, $config?: any, $action?: any): void;
}
export default UseApp;
