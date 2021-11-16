import { UseMicroAppOption } from './../typings';
declare class UseMicroApp {
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
    constructor({ option, Vue, VueRouter, render }: UseMicroAppOption);
    render(props?: {}): void;
    bootstrap(): Promise<void>;
    mount(props: any): void;
    unmount(): void;
    update(props: any): Promise<any>;
    start(): void;
}
export default UseMicroApp;
//# sourceMappingURL=index.d.ts.map