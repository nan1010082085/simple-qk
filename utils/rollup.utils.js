import chalk from 'chalk';
import fs from 'fs';
import rimraf from 'rimraf';

export const EXTENSIONS = ['.ts', '.tsx'];

export function log(message) {
  return console.log(message);
}

const fileList = ['es', 'lib', 'types'];
/**
 * 删除指定文件夹
 */
export function rimrafFile() {
  fileList.forEach((filename) => {
    if (fs.existsSync(filename)) {
      log(chalk.blue(`[EXIST OLD FILE] to delete ...`));
      rimraf(filename, {}, () => {
        log(chalk.green(`[DELETE] ${filename} success .`));
      });
    }
  });
}
