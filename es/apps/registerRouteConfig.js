export function registerRouteConfig(routes, option) {
    const { history, component, activeRule, local } = option;
    const isHash = history === 'hash' || typeof history !== 'string';
    const isVue3Router = typeof history !== 'string';
    routes.forEach((route) => {
        if (window.__POWERED_BY_QIANKUN__ && isHash) {
            route.path = `${route.path}`;
        }
        else {
            route.path = `/${route.path}`;
        }
    });
    const base = window.__POWERED_BY_QIANKUN__ ? `/${activeRule}/` : local;
    const common = isVue3Router
        ? {
            history: window.__POWERED_BY_QIANKUN__ ? history(`/${activeRule}/`) : history(`${local}`)
        }
        : {
            base,
            mode: history
        };
    let config = {
        ...common,
        routes
    };
    if (isHash) {
        if (!component) {
            throw new Error('[vue-router] component is undefined');
        }
        config = {
            ...common,
            routes: [
                {
                    path: base,
                    name: 'container',
                    component,
                    children: routes
                }
            ]
        };
    }
    return config;
}
