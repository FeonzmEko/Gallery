import { defineComponent, h, type PropType } from 'vue';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 border-transparent',
  secondary:
    'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 border-transparent',
  outline:
    'border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
  ghost:
    'bg-transparent text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-transparent',
  danger:
    'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 border-transparent',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs font-medium rounded-md gap-1.5',
  md: 'px-3.5 py-1.5 text-sm font-medium rounded-lg gap-2',
  lg: 'px-4.5 py-2.5 text-base font-semibold rounded-lg gap-2.5',
};

export const ArchiveButton = defineComponent({
  name: 'ArchiveButton',
  props: {
    variant: {
      type: String as PropType<ButtonVariant>,
      default: 'primary',
    },
    size: {
      type: String as PropType<ButtonSize>,
      default: 'md',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String as PropType<'button' | 'submit' | 'reset'>,
      default: 'button',
    },
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () => {
      const baseClass =
        'inline-flex items-center justify-center select-none transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
      const variantClass = variantClasses[props.variant] || variantClasses.primary;
      const sizeClass = sizeClasses[props.size] || sizeClasses.md;

      const children = [];
      if (props.loading) {
        children.push(
          h('span', {
            class:
              'animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2',
          })
        );
      }
      if (slots.default) {
        children.push(...slots.default());
      }

      return h(
        'button',
        {
          type: props.type,
          disabled: props.disabled || props.loading,
          class: [baseClass, variantClass, sizeClass].join(' '),
          onClick: (e: MouseEvent) => {
            if (!props.disabled && !props.loading) {
              emit('click', e);
            }
          },
        },
        children
      );
    };
  },
});
