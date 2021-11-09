import { CreateElement, VNode } from 'vue/types';
import { Vue, Component } from 'vue-property-decorator';

@Component({
  name: 'Container'
})
export default class Container extends Vue {
  render(h: CreateElement): VNode {
    return <router-view />;
  }
}
