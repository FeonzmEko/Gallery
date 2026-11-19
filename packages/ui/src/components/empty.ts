import { defineComponent, h } from 'vue';

export const ArchiveEmptyState = defineComponent({
  name: 'ArchiveEmptyState',
  props: {
    title: {
      type: String,
      default: '暂无记录',
    },
    description: {
      type: String,
      default: '还没有添加任何记忆或内容',
    },
  },
  setup(props, { slots }) {
    return () => {
      const children = [];
      if (slots.icon) {
        children.push(h('div', { class: 'text-neutral-400 mb-3 text-3xl' }, slots.icon()));
      }
      children.push(
        h('h3', { class: 'text-base font-semibold text-neutral-800 dark:text-neutral-200' }, props.title)
      );
      children.push(
        h(
          'p',
          { class: 'mt-1 text-sm text-neutral-500 dark:text-neutral-400 max-w-sm' },
          props.description
        )
      );
      if (slots.action) {
        children.push(h('div', { class: 'mt-5' }, slots.action()));
      }

      return h(
        'div',
        {
          class:
            'flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30',
        },
        children
      );
    };
  },
});
