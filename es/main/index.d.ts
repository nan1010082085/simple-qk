import { QKOption } from '../typings';
import { FrameworkConfiguration } from 'qiankun';
declare class UseApp {
    start: (option?: FrameworkConfiguration | undefined) => void;
    constructor({ isMicro, routes, config, action }: QKOption);
    useAppAction($routes?: any, $config?: any, $action?: any): void;
}
export default UseApp;
