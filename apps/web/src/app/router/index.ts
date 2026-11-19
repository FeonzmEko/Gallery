import {
  createRouter,
  createWebHistory,
  createMemoryHistory,
  type RouteRecordRaw,
} from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'timeline',
    component: () => import('@/pages/TimelinePage.vue'),
    meta: { title: '时光纪流 - Personal Archive' },
  },
  {
    path: '/timeline',
    redirect: '/',
  },
  {
    path: '/media',
    name: 'media',
    component: () => import('@/pages/MediaPage.vue'),
    meta: { title: '媒体长廊 - Personal Archive' },
  },
  {
    path: '/journal',
    name: 'journal',
    component: () => import('@/pages/JournalPage.vue'),
    meta: { title: '随想日记 - Personal Archive' },
  },
  {
    path: '/travel',
    name: 'travel',
    component: () => import('@/pages/TravelPage.vue'),
    meta: { title: '足迹漫游 - Personal Archive' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { title: '404 - 档案不存在' },
  },
];

export const router = createRouter({
  history: typeof window !== 'undefined' ? createWebHistory() : createMemoryHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

router.afterEach((to) => {
  if (to.meta.title && typeof document !== 'undefined') {
    document.title = String(to.meta.title);
  }
});
