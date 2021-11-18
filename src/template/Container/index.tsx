/**
 * @author: Yang Dongnan
 * 2021年11月17日
 */

import { defineComponent } from 'vue';
export default defineComponent({
  name: 'Container',
  setup() {
    return () => {
      return <route-view />;
    };
  }
});
