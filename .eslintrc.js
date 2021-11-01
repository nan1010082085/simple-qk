module.exports = {
  env: {
    browser: true,
    node: true,
    jasmine: true
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  extends: ['plugin:vue/vue3-recommended', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  plugins: ['@typescript-eslint', 'prettier', 'vue'],
  rules: {
    'vue/max-attributes-per-line': [
      'error',
      {
        singleline: 20,
        multiline: {
          max: 10
        }
      }
    ],
    'prettier/prettier': [
      'error',
      {
        // 结尾换行格式
        endOfLine: 'auto',
        // 末尾分号
        semi: true,
        // 单引号
        singleQuote: true,
        // jsx 单引号
        jsxSingleQuote: true,
        // 多行中输入为逗号
        trailingComma: 'none'
      }
    ],
    '@typescript-eslint/explicit-module-boundary-types': 0,
    '@typescript-eslint/indent': [0, 2],
    // 'trailing-comma': [1],
    'linebreak-style': [0, 'error', 'windows'], //允许window下换行符
    quotes: [1, 'single'], //字符串一个单引号
    'no-console': 'off', //可以有console.log在代码
    'global-require': 0, //允许全局require
    indent: [1, 2, { SwitchCase: 1 }], //缩进两个空格
    'consistent-this': 0,
    '@typescript-eslint/no-this-alias': [
      2,
      {
        allowDestructuring: true, // Allow `const { props, state } = this`; false by default
        allowedNames: ['self', 't', 'that']
      }
    ], //this可以声明为其他变量
    'react/react-in-jsx-scope': 0, //不必导入react
    '@typescript-eslint/no-unused-vars': [2, { argsIgnorePattern: '^h$', varsIgnorePattern: '^Vue$|^VNode$' }], //声明变量没有用，除了h
    '@typescript-eslint/no-explicit-any': 0, //可以用any类型
    'one-var': [0, { initialized: 'never' }],
    'comma-dangle': ['error', 'never'],
    'no-param-reassign': [0, { props: false }], //允许给参数赋值，修改
    eqeqeq: [0, 'smart'], //允许不是必须 ===，==也是可以
    'no-nested-ternary': [0], //允许套用三元运算符
    'class-methods-use-this': [0],
    'no-undef': ['error', {}],
    'no-extend-native': ['error', { exceptions: ['Date', 'Number'] }], //Object.prototype 只读 除了Date
    'react/no-unknown-property': [0], //允许未知属性
    'jsx-a11y/click-events-have-key-events': [0], //非button有鼠标事件时需要添加键盘事件。已忽略
    'jsx-a11y/interactive-supports-focus': [0],
    'react/style-prop-object': [0], //已经忽略style必须为object
    '@typescript-eslint/no-var-requires': [0], //允许requires
    'arrow-body-style': [0],
    'react/jsx-props-no-spreading': [0], //可以使用...运算符
    'react/jsx-boolean-value': [0], //可以在jsx中使用布尔值
    'max-len': [2, 300, 4, { ignoreUrls: true }], //每行最多300个字符
    'object-curly-newline': [0, { multiline: true, minProperties: 1 }], //object是否换行
    'react/no-string-refs': [0], //ref可以是字符串
    'import/prefer-default-export': [0], //可以省略default
    'react/no-array-index-key': [0],
    'import/no-dynamic-require': [0],
    // "import/no-unresolved": [2, { caseSensitive: false }],
    '@typescript-eslint/ban-ts-ignore': [0],
    'no-bitwise': ['error', { allow: ['|', '&'] }],
    'no-undef': ['error', { typeof: true }]
  },
  globals: {
    utils: true,
    ResType: true,
    __webpack_public_path__: true
  }
};
