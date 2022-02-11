import { UseMicroAppParam } from '../typings';
declare class UseMicroApp {
    constructor({ version, option, Vue, render, VueRouter }: UseMicroAppParam, isLogs?: boolean);
    render(appProps?: any): void;
    updateProps(updateProps?: any): void;
    bootstrap(): Promise<void>;
    mount(props: any): void;
    unmount(): void;
    update(props: any): void;
    start(): void;
    protected v2(container: any): void;
    protected v3(container: any): void;
}
export default UseMicroApp;
