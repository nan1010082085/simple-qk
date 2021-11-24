import { UseMicroAppOption } from '../typings';
declare class UseMicroApp {
    private version;
    private $history;
    private $routes;
    private $activeRule;
    private $local;
    private $component;
    private $log;
    private $name;
    private $instance;
    private $Vue;
    private $render;
    private $VueRouter;
    private $store;
    private $router;
    constructor({ version, option, Vue, VueRouter, render }: UseMicroAppOption);
    private v2;
    private v3;
    render(props?: any): void;
    bootstrap(): Promise<void>;
    mount(props: any): void;
    unmount(): void;
    update(props: any): Promise<any>;
    start(): void;
}
export default UseMicroApp;
