import { defineComponent, h, type PropType } from 'vue';

export const ArchiveCard = defineComponent({
  name: 'ArchiveCard',
  props: {
    interactive: {
      type: Boolean,
      default: false,
    },
    padding: {
      type: String as PropType<'none' | 'sm' | 'md' | 'lg'>,
      default: 'md',
    },
  },
  setup(props, { slots }) {
    return () => {
      const paddingClass = {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4 sm:p-5',
        lg: 'p-6 sm:p-8',
      }[props.padding];

      const interactiveClass = props.interactive
        ? 'cursor-pointer hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200'
        : '';

      return h(
        'div',
        {
          class: [
            'bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden',
            paddingClass,
            interactiveClass,
          ].join(' '),
        },
        slots.default ? slots.default() : undefined
      );
    };
  },
});
