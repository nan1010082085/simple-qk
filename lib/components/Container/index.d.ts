import { CreateElement, VNode } from 'vue/types';
import { Vue } from 'vue-property-decorator';
export default class Container extends Vue {
    render(h: CreateElement): VNode;
}
