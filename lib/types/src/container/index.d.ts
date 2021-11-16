import { QKOption } from '../typings';
import { start } from 'qiankun';
declare class UseApp {
    start: typeof start;
    constructor({ isMicro, routes, config, action }: QKOption);
    useAppAction($routes?: any, $config?: any, $action?: any): void;
}
export default UseApp;
//# sourceMappingURL=index.d.ts.map