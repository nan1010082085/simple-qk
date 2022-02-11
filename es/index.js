import * as QK from 'qiankun';
import UseApp from './main';
import UseMicroApp from './apps';
import subject from './common/rxjs';
export const QKRegisterApp = (option, isLogs) => new UseApp(option, isLogs);
export const QKRegisterMicroApp = (option, isLogs) => new UseMicroApp(option, isLogs);
export const Observable = (next, error, complete) => {
    return subject.subscribe({ next, error, complete });
};
export default QK;
