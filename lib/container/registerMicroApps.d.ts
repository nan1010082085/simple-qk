import { RoutesMicroApp, MicroAppsConfigOption } from '../typings';
export declare const activeRuleCheck: (mode: 'hash' | 'history', name: string) => string | ((location: Location) => boolean);
export declare function registerMicroAppsConfig(microApps: RoutesMicroApp[], option: MicroAppsConfigOption): void;
