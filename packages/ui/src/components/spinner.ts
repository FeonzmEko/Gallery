import { defineComponent, h, type PropType } from 'vue';

export type SpinnerSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
};

export const ArchiveSpinner = defineComponent({
  name: 'ArchiveSpinner',
  props: {
    size: {
      type: String as PropType<SpinnerSize>,
      default: 'md',
    },
  },
  setup(props) {
    return () => {
      const sizeClass = sizeMap[props.size] || sizeMap.md;
      return h('div', {
        class: `animate-spin rounded-full border-current border-t-transparent inline-block ${sizeClass}`,
        role: 'status',
        'aria-label': 'loading',
      });
    };
  },
});
