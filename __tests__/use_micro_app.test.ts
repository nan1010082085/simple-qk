/**
 * @author: Yang Dongnan
 * 2021年11月17日
 */

import UseMicroApp from '../src/apps';

const app: any = new UseMicroApp({
  option: {
    routes: [
      {
        path: 'login',
        name: 'login-micro-app',
        component: ''
      },
      {
        name: 'login-micro-app'
      }
    ],
    name: 'test-app',
    component: '',
    local: false
  },
  Vue: {},
  VueRouter: {},
  render: ''
});

it('Test UseMicroApp $name', () => {
  expect(app.$name).toEqual('test-app');
});

it('Test UseMicroApp is assign function', () => {
  expect(app).toMatchObject({
    render: {},
    mount: {},
    bootstrap: {},
    unmount: {}
  });
});
