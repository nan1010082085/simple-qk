import { RouteConfig, RegisterRouteConfigOption } from '../typings';
export declare function registerRouteConfig(routes: RouteConfig[], option: RegisterRouteConfigOption): {
    base?: string;
    mode?: string;
    history?: any;
    routes: any[];
};
