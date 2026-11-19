import { defineComponent, h, type PropType } from 'vue';

export const ArchiveSkeleton = defineComponent({
  name: 'ArchiveSkeleton',
  props: {
    width: {
      type: String,
      default: '100%',
    },
    height: {
      type: String,
      default: '1rem',
    },
    rounded: {
      type: String as PropType<'none' | 'sm' | 'md' | 'lg' | 'full'>,
      default: 'md',
    },
  },
  setup(props) {
    return () => {
      const roundedMap = {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        full: 'rounded-full',
      };

      return h('div', {
        class: [
          'animate-pulse bg-neutral-200 dark:bg-neutral-800',
          roundedMap[props.rounded],
        ].join(' '),
        style: {
          width: props.width,
          height: props.height,
        },
      });
    };
  },
});
