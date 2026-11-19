<template>
  <div class="min-h-screen bg-[#F7F5F0] text-[#1D1C1A] flex flex-col relative selection:bg-[#C25438]/20 selection:text-[#C25438]">
    <!-- ========================================================= -->
    <!-- TOP STICKY CAPSULE NAVIGATION (Warm Paper + Pill Bar)     -->
    <!-- ========================================================= -->
    <header class="sticky top-0 z-40 bg-[#F7F5F0]/88 backdrop-blur-md border-b border-[#E5E1D8] transition-all">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <!-- Left: Archival Brand Mark -->
        <RouterLink to="/" class="flex items-center gap-3 group min-w-0">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-[#E5E1D8] shadow-xs text-[#C25438] group-hover:border-[#C25438]/50 group-hover:scale-105 transition-all"
          >
            <ArchiveIcon class="w-4 h-4" />
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-serif font-medium text-base tracking-tight text-[#1D1C1A] group-hover:text-[#C25438] transition-colors truncate">
                Personal Archive
              </span>
              <span
                class="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider bg-[#EFECE4] text-[#747169] border border-[#E5E1D8]"
              >
                VOL. I
              </span>
            </div>
            <span class="text-[10px] text-[#9E9B93] font-mono tracking-wider flex items-center gap-1.5 truncate">
              <span
                class="w-1.5 h-1.5 rounded-full shrink-0"
                :class="authStore.isAdmin ? 'bg-[#4E6053] animate-pulse' : 'bg-[#C25438]'"
              ></span>
              {{ authStore.isAdmin ? '策展管理员已解锁' : '公开只读策展 · OCCURRED AT' }}
            </span>
          </div>
        </RouterLink>

        <!-- Center: Floating Pill Navigation (Visible on md and up) -->
        <nav class="hidden md:flex items-center bg-[#EFECE4] p-1 rounded-full border border-[#E5E1D8] gap-1 shadow-inner">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all"
            :class="[
              isNavActive(item)
                ? 'bg-white text-[#1D1C1A] font-semibold shadow-xs border border-[#E5E1D8]'
                : 'text-[#747169] hover:text-[#1D1C1A] hover:bg-white/60 border border-transparent',
            ]"
          >
            <component
              :is="item.icon"
              class="w-3.5 h-3.5 transition-colors"
              :class="isNavActive(item) ? 'text-[#C25438]' : 'text-[#9E9B93]'"
            />
            <span>{{ item.title }}</span>
            <span
              v-if="isNavActive(item)"
              class="w-1.5 h-1.5 rounded-full bg-[#C25438]"
            ></span>
          </RouterLink>
        </nav>

        <!-- Right: Live Clock, Admin Quick Console / Keyhole -->
        <div class="flex items-center gap-2.5 shrink-0 relative">
          <!-- Time indicator -->
          <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-[#E5E1D8] font-mono text-[11px] text-[#747169]">
            <ClockIcon class="w-3 h-3 text-[#9E9B93]" />
            <span>{{ liveTimeString }}</span>
          </div>

          <!-- If Admin: Quick Console Trigger + Logout -->
          <div v-if="authStore.isAdmin" class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#4E6053]/10 text-[#4E6053] border border-[#4E6053]/25 hover:bg-[#4E6053]/15 font-mono text-xs transition-colors"
              @click="uiStore.isQuickMenuOpen = !uiStore.isQuickMenuOpen"
              title="打开策展快捷工作台"
            >
              <ShieldCheckIcon class="w-3.5 h-3.5" />
              <span class="hidden lg:inline">{{ authStore.user?.displayName || 'Archivist' }}</span>
              <PlusIcon class="w-3 h-3" />
            </button>
            <button
              type="button"
              class="flex items-center justify-center h-8 w-8 rounded-full bg-white border border-[#E5E1D8] text-[#747169] hover:text-[#C25438] hover:border-[#C25438]/40 hover:bg-[#FDF8F6] transition-colors"
              @click="handleLogout"
              title="退出管理员身份"
            >
              <LogOutIcon class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- If Guest: Secret Keyhole Icon -->
          <button
            v-else
            type="button"
            class="flex items-center justify-center h-8 w-8 rounded-full bg-white border border-[#E5E1D8] text-[#747169] hover:text-[#C25438] hover:border-[#C25438]/40 hover:bg-[#FDF8F6] transition-all shadow-xs"
            @click="authStore.openLoginModal"
            title="管理员暗门 (快捷键: Ctrl + Shift + L)"
          >
            <KeyRoundIcon class="w-4 h-4" />
          </button>

          <!-- Admin Quick Action Popover -->
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-1 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-1 scale-95"
          >
            <div
              v-if="authStore.isAdmin && uiStore.isQuickMenuOpen"
              class="absolute right-0 top-11 w-60 rounded-2xl border border-[#E5E1D8] bg-white p-2 shadow-xl z-50"
            >
              <div class="px-3 py-2 border-b border-[#F0ECE1] mb-1">
                <p class="text-[10px] font-mono tracking-wider text-[#9E9B93] uppercase">ARCHIVIST WORKBENCH</p>
                <p class="text-xs font-medium text-[#1D1C1A] truncate mt-0.5">
                  {{ authStore.user?.email || 'admin@archive.internal' }}
                </p>
              </div>
              <button
                v-for="action in quickActions"
                :key="action.target"
                type="button"
                class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#1D1C1A] hover:bg-[#F7F5F0] transition-colors text-left"
                @click="dispatchQuickAction(action.target, action.route)"
              >
                <component :is="action.icon" class="w-3.5 h-3.5 text-[#C25438]" />
                <span>{{ action.label }}</span>
              </button>
              <div class="border-t border-[#F0ECE1] mt-1 pt-1">
                <button
                  type="button"
                  class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#747169] hover:text-[#C25438] hover:bg-[#FDF8F6] transition-colors text-left"
                  @click="handleLogout"
                >
                  <LogOutIcon class="w-3.5 h-3.5" />
                  <span>锁定并退出管理</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <!-- Click-outside backdrop for quick menu -->
    <div
      v-if="uiStore.isQuickMenuOpen"
      class="fixed inset-0 z-30"
      @click="uiStore.isQuickMenuOpen = false"
    ></div>

    <!-- ========================================================= -->
    <!-- MAIN CONTENT VIEWPORT (Bento Canvas)                      -->
    <!-- ========================================================= -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 md:pb-16">
      <slot>
        <RouterView />
      </slot>
    </main>

    <!-- ========================================================= -->
    <!-- DESKTOP EDITORIAL FOOTER                                  -->
    <!-- ========================================================= -->
    <footer class="hidden md:block border-t border-[#E5E1D8] bg-[#F7F5F0] py-8 text-xs text-[#747169]">
      <div class="max-w-7xl mx-auto px-8 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="font-serif italic text-sm text-[#1D1C1A]">Personal Archive</span>
          <span>&middot;</span>
          <span>独立自持数字长廊与记忆刻度</span>
          <span>&middot;</span>
          <span class="font-mono text-[#9E9B93]">OCCURRED AT 排序</span>
        </div>
        <div class="flex items-center gap-4">
          <span class="font-mono text-[11px] text-[#9E9B93]">EST. 2018–2026</span>
          <button
            type="button"
            class="hover:text-[#C25438] transition-colors font-mono text-[11px] underline decoration-[#E5E1D8] underline-offset-4"
            @click="handleGatewayClick"
          >
            {{ authStore.isAdmin ? '策展工作台' : 'Archivist Gateway' }}
          </button>
        </div>
      </div>
    </footer>

    <!-- ========================================================= -->
    <!-- MOBILE BOTTOM NAVIGATION (Visible only on < md)           -->
    <!-- ========================================================= -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#E5E1D8] bg-[#F7F5F0]/95 backdrop-blur-xl pb-safe shadow-lg">
      <div class="flex h-16 items-center justify-around px-2">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex flex-col items-center justify-center flex-1 py-1 transition-all relative"
          :class="[
            isNavActive(item)
              ? 'text-[#C25438] font-semibold'
              : 'text-[#747169] hover:text-[#1D1C1A]',
          ]"
        >
          <component :is="item.icon" class="w-5 h-5 mb-1" />
          <span class="text-[10px] tracking-tight">{{ item.title }}</span>
          <span
            v-if="isNavActive(item)"
            class="absolute bottom-1 h-1 w-5 rounded-full bg-[#C25438]"
          ></span>
        </RouterLink>

        <!-- 5th Mobile Tab: Admin Gateway / Workbench -->
        <button
          type="button"
          class="flex flex-col items-center justify-center flex-1 py-1 transition-colors"
          :class="authStore.isAdmin ? 'text-[#4E6053]' : 'text-[#747169] hover:text-[#C25438]'"
          @click="handleGatewayClick"
        >
          <ShieldCheckIcon v-if="authStore.isAdmin" class="w-5 h-5 mb-1" />
          <KeyRoundIcon v-else class="w-5 h-5 mb-1" />
          <span class="text-[10px] tracking-tight">
            {{ authStore.isAdmin ? '工作台' : '暗门' }}
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
          class="flex h-12 w-12 items-center justify-center rounded-full bg-[#C25438] text-white shadow-xl shadow-[#C25438]/30 active:scale-95 transition-transform"
          title="快速记录"
          @click="uiStore.isQuickMenuOpen = !uiStore.isQuickMenuOpen"
        >
          <PlusIcon class="w-6 h-6" />
        </button>
      </div>
    </Transition>

    <!-- Global Notifications & Modals -->
    <ToastContainer />
    <ConfirmModal />
    <PwaInstallPrompt />
    <LoginModal />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter, RouterLink, RouterView } from 'vue-router';
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
  UploadCloud as UploadCloudIcon,
  PenSquare as PenSquareIcon,
  MapPinPlus as MapPinPlusIcon,
} from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useUiStore, type QuickCreateTarget } from '@/shared/stores/ui.store';
import LoginModal from '@/features/auth/components/LoginModal.vue';
import PwaInstallPrompt from '@/shared/components/pwa/PwaInstallPrompt.vue';
import ToastContainer from '@/shared/components/ui/ToastContainer.vue';
import ConfirmModal from '@/shared/components/ui/ConfirmModal.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const uiStore = useUiStore();

interface NavItem {
  title: string;
  path: string;
  altPaths?: string[];
  icon: any;
}

const navItems: NavItem[] = [
  { title: '时光编年', path: '/', altPaths: ['/timeline'], icon: ClockIcon },
  { title: '影像长廊', path: '/media', icon: ImageIcon },
  { title: '随想手札', path: '/journal', icon: BookOpenIcon },
  { title: '足迹漫游', path: '/travel', icon: CompassIcon },
];

const quickActions: { label: string; target: QuickCreateTarget; route: string; icon: any }[] = [
  { label: '记录时光条目', target: 'entry', route: '/', icon: ClockIcon },
  { label: '直传摄影胶片', target: 'photo', route: '/media', icon: UploadCloudIcon },
  { label: '撰写随想手札', target: 'journal', route: '/journal', icon: PenSquareIcon },
  { label: '标记旅行足迹', target: 'trip', route: '/travel', icon: MapPinPlusIcon },
];

function isNavActive(item: NavItem): boolean {
  if (route.path === item.path) return true;
  if (item.altPaths && item.altPaths.includes(route.path)) return true;
  return false;
}

async function dispatchQuickAction(target: QuickCreateTarget, targetRoute: string): Promise<void> {
  uiStore.triggerQuickAction(target);
  if (route.path !== targetRoute) {
    await router.push(targetRoute);
  }
}

function handleGatewayClick(): void {
  if (authStore.isAdmin) {
    uiStore.isQuickMenuOpen = !uiStore.isQuickMenuOpen;
  } else {
    authStore.openLoginModal();
  }
}

async function handleLogout(): Promise<void> {
  uiStore.isQuickMenuOpen = false;
  await authStore.logout();
  uiStore.notifyInfo('已锁定管理权限，切换为公开访客视图');
}

// Live Time Display
const liveTimeString = ref('');
let timer: number | null = null;

function updateLiveTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  liveTimeString.value = `${hours}:${minutes}:${seconds}`;
}

onMounted(() => {
  updateLiveTime();
  timer = window.setInterval(updateLiveTime, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>
