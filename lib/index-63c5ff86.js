'use strict';

var vue = require('vue');

var index = vue.defineComponent({
  name: 'Container',

  setup() {
    const h = this.$createElement;
    return () => {
      return h("route-view");
    };
  }

});

exports["default"] = index;
//# sourceMappingURL=index-63c5ff86.js.map
