<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row relative overflow-x-hidden">
    <!-- ========================================================= -->
    <!-- DESKTOP SIDEBAR (Visible on md and up)                    -->
    <!-- ========================================================= -->
    <aside
      class="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-slate-800/80 bg-slate-900/80 backdrop-blur-xl"
    >
      <!-- Top Brand Header -->
      <div class="flex h-16 items-center justify-between px-6 border-b border-slate-800/60">
        <RouterLink to="/" class="flex items-center gap-3 group">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 text-slate-950 font-bold shadow-lg shadow-sky-500/10 group-hover:scale-105 transition-transform"
          >
            <ArchiveIcon class="w-5 h-5" />
          </div>
          <div>
            <span class="font-bold text-sm tracking-tight text-white block group-hover:text-sky-300 transition-colors">
              Archive
            </span>
            <span class="text-[10px] text-slate-400 tracking-wider font-mono block">
              PERSONAL STREAM
            </span>
          </div>
        </RouterLink>
        <span
          class="rounded-full bg-slate-800/90 px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700/50"
        >
          v0.1
        </span>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all"
          :class="[
            isNavActive(item)
              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent',
          ]"
        >
          <component
            :is="item.icon"
            class="w-5 h-5 transition-transform group-hover:scale-110"
            :class="isNavActive(item) ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-200'"
          />
          <span>{{ item.title }}</span>
          <span
            v-if="isNavActive(item)"
            class="ml-auto h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"
          ></span>
        </RouterLink>
      </nav>

      <!-- Desktop Sidebar Footer / Auth Status -->
      <div class="p-4 border-t border-slate-800/60 bg-slate-950/40">
        <!-- If Admin: Show privileges and quick action -->
        <div v-if="authStore.isAdmin" class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span class="text-xs font-semibold text-emerald-400">已解锁管理员</span>
            </div>
            <button
              type="button"
              class="text-xs text-slate-400 hover:text-red-400 transition-colors"
              @click="handleLogout"
              title="退出登录"
            >
              <LogOutIcon class="w-4 h-4" />
            </button>
          </div>

          <div class="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-2.5">
            <div class="text-[11px] text-slate-300 font-medium truncate">
              {{ authStore.user?.displayName || authStore.user?.email || 'Archivist Owner' }}
            </div>
            <div class="mt-1 flex items-center gap-1 text-[10px] text-emerald-400/90 font-mono">
              <ShieldCheckIcon class="w-3 h-3" />
              <span>全量写与直传已就绪</span>
            </div>
          </div>
        </div>

        <!-- If Guest: Discreet Guest Indicator + Secret Door Trigger -->
        <div v-else class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span class="h-1.5 w-1.5 rounded-full bg-slate-600"></span>
            <span>访客公开只读</span>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-500 hover:text-sky-400 hover:bg-slate-800/80 transition-colors"
            @click="authStore.openLoginModal"
            title="管理员暗门 (Ctrl+Shift+L)"
          >
            <KeyRoundIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- ========================================================= -->
    <!-- MOBILE TOP BAR (Visible only on < md)                     -->
    <!-- ========================================================= -->
    <header
      class="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 backdrop-blur-xl"
    >
      <RouterLink to="/" class="flex items-center gap-2.5">
        <div
          class="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-emerald-400 text-slate-950 font-bold shadow"
        >
          <ArchiveIcon class="w-4 h-4" />
        </div>
        <span class="font-bold text-sm tracking-tight text-white">Archive</span>
      </RouterLink>

      <div class="flex items-center gap-2">
        <!-- Admin indicator or Guest secret door -->
        <button
          v-if="authStore.isAdmin"
          type="button"
          class="flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs text-emerald-400"
          @click="authStore.openLoginModal"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          <span class="text-[11px] font-medium">管理员</span>
        </button>
        <button
          v-else
          type="button"
          class="rounded-lg p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
          @click="authStore.openLoginModal"
          title="管理员暗门"
        >
          <KeyRoundIcon class="w-4 h-4" />
        </button>
      </div>
    </header>

    <!-- ========================================================= -->
    <!-- MAIN CONTENT VIEWPORT                                     -->
    <!-- ========================================================= -->
    <div class="flex-1 md:pl-64 flex flex-col min-h-screen">
      <!-- Main Content Container -->
      <main class="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto pb-24 md:pb-12">
        <slot>
          <RouterView />
        </slot>
      </main>

      <!-- Desktop Footer -->
      <footer
        class="hidden md:flex border-t border-slate-800/60 py-6 px-8 text-xs text-slate-500 items-center justify-between max-w-6xl w-full mx-auto"
      >
        <div class="flex items-center gap-2">
          <span>Personal Archive &copy; 2026</span>
          <span>&middot;</span>
          <span>自主持久化数字档案系统</span>
        </div>
        <button
          type="button"
          class="hover:text-slate-400 transition-colors font-mono text-[11px]"
          @click="authStore.openLoginModal"
        >
          {{ authStore.isAdmin ? 'Admin Console' : 'Archivist Gateway' }}
        </button>
      </footer>
    </div>

    <!-- ========================================================= -->
    <!-- MOBILE BOTTOM NAVIGATION (Visible only on < md)           -->
    <!-- ========================================================= -->
    <nav
      class="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-xl pb-safe"
    >
      <div class="flex h-16 items-center justify-around px-2">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex flex-col items-center justify-center flex-1 py-1 transition-colors relative"
          :class="[
            isNavActive(item)
              ? 'text-sky-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 font-normal',
          ]"
        >
          <component :is="item.icon" class="w-5 h-5 mb-1" />
          <span class="text-[10px] tracking-tight">{{ item.title }}</span>
          <span
            v-if="isNavActive(item)"
            class="absolute bottom-1 h-0.5 w-6 rounded-full bg-sky-400"
          ></span>
        </RouterLink>

        <!-- 5th Mobile Tab: Admin / Secret Entry -->
        <button
          type="button"
          class="flex flex-col items-center justify-center flex-1 py-1 transition-colors"
          :class="authStore.isAdmin ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'"
          @click="authStore.openLoginModal"
        >
          <ShieldCheckIcon v-if="authStore.isAdmin" class="w-5 h-5 mb-1" />
          <KeyRoundIcon v-else class="w-5 h-5 mb-1" />
          <span class="text-[10px] tracking-tight">
            {{ authStore.isAdmin ? '管理' : '暗门' }}
          </span>
        </button>
      </div>
    </nav>

    <!-- Floating Action Button for Admin on Mobile -->
    <Transition
      enter-active-class="transform ease-out duration-200 transition"
      enter-from-class="scale-0 opacity-0"
      enter-to-class="scale-100 opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="scale-100 opacity-100"
      leave-to-class="scale-0 opacity-0"
    >
      <div
        v-if="authStore.isAdmin"
        class="md:hidden fixed bottom-20 right-4 z-30"
      >
        <button
          type="button"
          class="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-slate-950 shadow-xl shadow-sky-500/25 active:scale-95 transition-transform"
          title="发布记录"
        >
          <PlusIcon class="w-6 h-6" />
        </button>
      </div>
    </Transition>

    <!-- PWA Install & Update Component -->
    <PwaInstallPrompt />

    <!-- Admin Authentication Modal -->
    <LoginModal />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, RouterLink, RouterView } from 'vue-router';
import {
  Archive as ArchiveIcon,
  Clock as ClockIcon,
  Image as ImageIcon,
  BookOpen as BookOpenIcon,
  Compass as CompassIcon,
  KeyRound as KeyRoundIcon,
  ShieldCheck as ShieldCheckIcon,
  LogOut as LogOutIcon,
  Plus as PlusIcon,
} from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import LoginModal from '@/features/auth/components/LoginModal.vue';
import PwaInstallPrompt from '@/shared/components/pwa/PwaInstallPrompt.vue';

const route = useRoute();
const authStore = useAuthStore();

interface NavItem {
  title: string;
  path: string;
  altPaths?: string[];
  icon: any;
}

const navItems: NavItem[] = [
  { title: '时间线', path: '/', altPaths: ['/timeline'], icon: ClockIcon },
  { title: '画廊', path: '/media', icon: ImageIcon },
  { title: '日记', path: '/journal', icon: BookOpenIcon },
  { title: '足迹', path: '/travel', icon: CompassIcon },
];

function isNavActive(item: NavItem): boolean {
  if (route.path === item.path) return true;
  if (item.altPaths && item.altPaths.includes(route.path)) return true;
  return false;
}

async function handleLogout(): Promise<void> {
  await authStore.logout();
}
</script>
