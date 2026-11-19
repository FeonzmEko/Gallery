import { defineComponent, h, type PropType } from 'vue';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default:
    'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700',
  success:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  warning:
    'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
  danger:
    'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
  info:
    'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800/50',
};

export const ArchiveBadge = defineComponent({
  name: 'ArchiveBadge',
  props: {
    variant: {
      type: String as PropType<BadgeVariant>,
      default: 'default',
    },
    dot: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { slots }) {
    return () => {
      const baseClass =
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border';
      const variantClass = badgeVariantClasses[props.variant] || badgeVariantClasses.default;

      const children = [];
      if (props.dot) {
        children.push(h('span', { class: 'w-1.5 h-1.5 rounded-full bg-current opacity-70' }));
      }
      if (slots.default) {
        children.push(...slots.default());
      }

      return h(
        'span',
        { class: [baseClass, variantClass].join(' ') },
        children
      );
    };
  },
});
