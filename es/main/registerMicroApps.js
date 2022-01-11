const getActiveRule = (hash) => (location) => location.hash.startsWith(hash);
export const activeRuleCheck = (mode, name) => {
    return mode === 'hash' ? getActiveRule(`#/${name.split('-')[0]}`) : `/${name.split('-')[0]}`;
};
export function registerMicroAppsConfig(microApps, option) {
    const { mode, container = '#micro-app-container', env = 'dev', devParam = [] } = option;
    microApps.forEach((apps) => {
        const entry = env === 'dev' && devParam && devParam.find(({ key, url }) => key === apps.name) || null;
        apps.activeRule = activeRuleCheck(mode, apps.name);
        apps.container = container;
        apps.entry = entry && env ? entry.url : `/${apps.name}/`;
    });
}
