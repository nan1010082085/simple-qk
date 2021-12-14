# SIMPLE-QK

为`qiankun`提供便捷的组件注册和微应用路由注册

## 注册微应用

```js
import { QKRegisterApp } from 'simple-qk';

// 注册微应用
const app = QKRegisterApp({
  routes: routesMicroApps,
  config: {
    mode: config.ROUTE_MODE,
    env: env ? 'prod' : 'dev', // 当前环境变量
    devParam: proxyJson().microApps
  },
  action: { // 生命周期
    beforeLoad: async (app: any) => {
      console.log('before load [CONTAINER]', app.name);
    },
    beforeMount: async (app: any) => {
      console.log('before mount [CONTAINER]', app.name);
    }
  }
});

app.start();
```

## Default Component

- 微应用默认 `router-view` 默认使用 `vue@next` 创建
- 微应用注册 `component` 必填

```js
import { QKRegisterMicroApp } from 'simple-qk';

// 注册微应用路由
QKRegisterMicroApp({
  option: {
    component: // custom component
    // ...
  }
  // ...
})

```
