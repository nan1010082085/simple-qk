import { UseMicroAppParam } from '../typings';
declare class UseMicroApp {
    constructor({ version, option, Vue, VueRouter, render }: UseMicroAppParam, isLogs?: boolean);
    render(props?: any): void;
    bootstrap(): Promise<void>;
    mount(props: any): void;
    unmount(): void;
    update(props: any): Promise<any>;
    start(): void;
    v2(container: any): void;
    v3(container: any): void;
}
export default UseMicroApp;
