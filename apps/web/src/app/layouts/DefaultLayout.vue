<template>
  <div class="min-h-screen bg-[var(--canvas)] text-[var(--ink)] flex flex-col relative selection:bg-[#9A3F2B]/15 selection:text-[#9A3F2B]">
    <!-- ========================================================= -->
    <!-- STATIC LOW-OVERHEAD AMBIENT GALLERY AURA & MARGIN RAILS   -->
    <!-- ========================================================= -->
    <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div class="absolute inset-0 ambient-aura-left"></div>
      <div class="absolute inset-0 ambient-aura-right"></div>
      <div class="hidden md:block absolute inset-0 ambient-aura-bottom"></div>
      <!-- Subtle content-boundary framing on wide screens without shifting exhibition layout -->
      <div class="hidden xl:block max-w-[1360px] h-full mx-auto relative">
        <span class="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-[var(--rule)]/55 to-transparent"></span>
        <span class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-[var(--rule)]/55 to-transparent"></span>
        <span class="absolute inset-y-0 -left-10 w-10 bg-gradient-to-r from-transparent to-[var(--boundary-sheen)] opacity-60"></span>
        <span class="absolute inset-y-0 -right-10 w-10 bg-gradient-to-l from-transparent to-[var(--boundary-sheen)] opacity-60"></span>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- ARCHITECTURAL GALLERY MASTHEAD                            -->
    <!-- ========================================================= -->
    <header class="sticky top-0 z-40 archival-glass-chrome border-b border-[var(--rule)]">
      <div class="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 h-[72px] flex items-center justify-between gap-6">
        <!-- Left: Minimalist Museum Emblem & Wordmark -->
        <RouterLink to="/" class="flex items-center gap-3.5 group min-w-0 shrink-0">
          <!-- Architectural Aperture Frame Mark -->
          <div class="relative w-7 h-7 flex items-center justify-center shrink-0">
            <span class="absolute inset-0 border border-[#161513] transition-transform duration-500 ease-gallery group-hover:scale-95"></span>
            <span class="absolute inset-[4px] border border-[#DDD6C9] transition-colors duration-300 group-hover:border-[#9A3F2B]/60"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-[#9A3F2B] transition-transform duration-300 group-hover:scale-125"></span>
          </div>
          <div class="flex items-baseline gap-2.5 min-w-0">
            <span
              translate="no"
              class="font-display italic text-[22px] font-medium tracking-[0.02em] text-[#161513] group-hover:text-[#9A3F2B] transition-colors leading-none"
            >
              Personal Archive
            </span>
            <span class="hidden sm:inline-block h-3 w-[1px] bg-[#C4BBA9] self-center"></span>
            <span class="hidden sm:inline-block font-serif text-xs tracking-[0.18em] text-[#57534C] truncate">
              私人数字展馆
            </span>
          </div>
        </RouterLink>

        <!-- Center: Pure Typographic Chapter Navigation (Desktop) -->
        <nav aria-label="主导航" class="hidden md:flex items-center gap-9 lg:gap-11 h-full">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="group relative h-full inline-flex items-center gap-2 text-[13px] tracking-[0.1em] transition-colors duration-300"
            :class="
              isNavActive(item)
                ? 'text-[#161513] font-medium'
                : 'text-[#57534C] hover:text-[#161513]'
            "
          >
            <span
              class="font-display italic text-[13.5px] tracking-normal transition-colors"
              :class="isNavActive(item) ? 'text-[#9A3F2B]' : 'text-[#787268] group-hover:text-[#161513]'"
            >
              {{ item.roman }}
            </span>
            <span class="font-serif">{{ item.title }}</span>
            <span
              class="absolute bottom-0 inset-x-0 h-[1.5px] bg-[#9A3F2B] transition-transform duration-300 ease-gallery origin-left"
              :class="isNavActive(item) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50 group-hover:bg-[#C4BBA9]'"
            ></span>
          </RouterLink>
        </nav>

        <!-- Right: Quiet Curatorial Gateway -->
        <div class="flex items-center gap-3 shrink-0 relative">
          <template v-if="authStore.isAdmin">
            <button
              type="button"
              class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-[2px] border border-[#3D4E42]/40 bg-[#FAF8F4] text-[#3D4E42] hover:bg-[#3D4E42] hover:text-[#FAF8F4] text-xs tracking-[0.12em] font-serif transition-colors duration-200"
              @click="uiStore.isQuickMenuOpen = !uiStore.isQuickMenuOpen"
              title="打开策展快捷工作台"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span>策展台</span>
              <PlusIcon class="w-3 h-3" />
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center h-8 w-8 rounded-[2px] border border-[#DDD6C9] text-[#57534C] hover:text-[#9A3F2B] hover:border-[#9A3F2B]/50 transition-colors"
              @click="handleLogout"
              title="锁定并退出管理"
            >
              <LogOutIcon class="w-3.5 h-3.5" />
            </button>
          </template>

          <button
            v-else
            type="button"
            translate="no"
            class="group inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono tracking-[0.16em] uppercase text-[#57534C] hover:text-[#161513] border border-transparent hover:border-[#DDD6C9] rounded-[2px] transition-all duration-200"
            @click="authStore.openLoginModal"
            title="管理员暗门 (Ctrl + Shift + L)"
          >
            <KeyRoundIcon class="w-3.5 h-3.5 text-[#787268] group-hover:text-[#9A3F2B] transition-colors" />
            <span class="hidden sm:inline">CURATOR</span>
          </button>

          <!-- Admin Curatorial Workbench Popover -->
          <Transition
            enter-active-class="transition duration-200 ease-gallery"
            enter-from-class="opacity-0 translate-y-1.5"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-1"
          >
            <div
              v-if="authStore.isAdmin && uiStore.isQuickMenuOpen"
              class="absolute right-0 top-12 w-64 rounded-[2px] border archival-glass shadow-[0_24px_48px_-20px_rgba(22,21,19,0.22)] z-50 overflow-hidden"
            >
              <div class="px-4 py-3 border-b border-[#E8E2D6] bg-[#F3EFE7]/60">
                <p class="kicker-caps text-[#9B9488]">CURATOR WORKBENCH</p>
                <p class="text-xs font-mono text-[#161513] truncate mt-1">
                  {{ authStore.user?.email || 'admin@archive.internal' }}
                </p>
              </div>
              <div class="py-1.5">
                <button
                  v-for="action in quickActions"
                  :key="action.target"
                  type="button"
                  class="w-full flex items-center justify-between px-4 py-2.5 text-xs text-[#161513] hover:bg-[#F3EFE7] transition-colors text-left group"
                  @click="dispatchQuickAction(action.target, action.route)"
                >
                  <span class="flex items-center gap-2.5 font-serif tracking-wide">
                    <component :is="action.icon" class="w-3.5 h-3.5 text-[#9A3F2B]" />
                    <span>{{ action.label }}</span>
                  </span>
                  <span class="font-mono text-[10px] text-[#9B9488] group-hover:text-[#9A3F2B] transition-colors">+</span>
                </button>
              </div>
              <div class="border-t border-[#E8E2D6] py-1.5 bg-[#F3EFE7]/40">
                <button
                  type="button"
                  class="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#787268] hover:text-[#9A3F2B] transition-colors text-left"
                  @click="handleLogout"
                >
                  <LogOutIcon class="w-3.5 h-3.5" />
                  <span class="font-serif">锁定并退出管理</span>
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
    <!-- EXHIBITION VIEWPORT                                       -->
    <!-- ========================================================= -->
    <main class="relative z-10 flex-1 max-w-[1360px] w-full mx-auto px-5 sm:px-8 lg:px-12 pt-10 sm:pt-14 pb-28 md:pb-24">
      <slot>
        <RouterView />
      </slot>
    </main>

    <!-- ========================================================= -->
    <!-- PRINT MONOGRAPH COLOPHON FOOTER (Desktop)                 -->
    <!-- ========================================================= -->
    <footer class="relative z-10 hidden md:block border-t border-[var(--rule)] archival-glass-chrome">
      <div class="max-w-[1360px] mx-auto px-8 lg:px-12 py-10">
        <div class="flex items-center justify-between gap-8">
          <div class="flex items-baseline gap-4">
            <span translate="no" class="font-display italic text-lg text-[#161513]">Personal Archive</span>
            <span class="text-[#C4BBA9]">/</span>
            <span class="font-serif text-xs tracking-[0.14em] text-[#57534C]">
              独立自持数字展馆 · 以发生刻度典藏光阴
            </span>
          </div>

          <div class="flex items-center gap-7">
            <div class="flex items-center gap-5 text-[11px] font-mono tracking-[0.14em] text-[#6E685E]">
              <RouterLink
                v-for="item in navItems"
                :key="item.path"
                :to="item.path"
                class="hover:text-[#161513] transition-colors"
              >
                {{ item.roman }}
              </RouterLink>
            </div>
            <span class="h-3 w-[1px] bg-[#DDD6C9]"></span>
            <span class="font-mono text-[10px] tracking-[0.18em] text-[#6E685E]">MMXVIII — MMXXVI</span>
            <button
              type="button"
              translate="no"
              class="font-mono text-[10px] tracking-[0.18em] uppercase text-[#57534C] hover:text-[#9A3F2B] transition-colors underline decoration-[#C4BBA9] underline-offset-4"
              @click="handleGatewayClick"
            >
              {{ authStore.isAdmin ? 'Workbench' : 'Curator' }}
            </button>
          </div>
        </div>
      </div>
    </footer>

    <!-- ========================================================= -->
    <!-- ARCHITECTURAL MOBILE BOTTOM RAIL (< md)                   -->
    <!-- ========================================================= -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--rule)] archival-glass-chrome pb-safe">
      <div class="flex h-16 items-stretch justify-around px-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="relative flex flex-col items-center justify-center flex-1 gap-1 transition-colors"
          :class="isNavActive(item) ? 'text-[#161513]' : 'text-[#8E887E]'"
        >
          <span
            v-if="isNavActive(item)"
            class="absolute top-0 inset-x-4 h-[1.5px] bg-[#9A3F2B]"
          ></span>
          <span
            class="font-display italic text-sm leading-none"
            :class="isNavActive(item) ? 'text-[#9A3F2B]' : 'text-[#9B9488]'"
          >
            {{ item.roman }}
          </span>
          <span class="font-serif text-[11px] tracking-[0.1em]">{{ item.shortTitle }}</span>
        </RouterLink>

        <button
          type="button"
          class="relative flex flex-col items-center justify-center flex-1 gap-1 transition-colors"
          :class="authStore.isAdmin ? 'text-[#3D4E42]' : 'text-[#8E887E]'"
          @click="handleGatewayClick"
        >
          <ShieldCheckIcon v-if="authStore.isAdmin" class="w-4 h-4" />
          <KeyRoundIcon v-else class="w-4 h-4" />
          <span class="font-serif text-[11px] tracking-[0.1em]">
            {{ authStore.isAdmin ? '策展' : '暗门' }}
          </span>
        </button>
      </div>
    </nav>

    <!-- Floating Curatorial Create Trigger (Admin Mobile) -->
    <Transition
      enter-active-class="transform ease-gallery duration-200 transition"
      enter-from-class="scale-90 opacity-0"
      enter-to-class="scale-100 opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="scale-100 opacity-100"
      leave-to-class="scale-90 opacity-0"
    >
      <div
        v-if="authStore.isAdmin"
        class="md:hidden fixed bottom-20 right-5 z-30"
      >
        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-[2px] bg-[#161513] text-[#FAF8F4] border border-[#161513] shadow-xl active:scale-95 transition-transform"
          title="快速记录"
          @click="uiStore.isQuickMenuOpen = !uiStore.isQuickMenuOpen"
        >
          <PlusIcon class="w-5 h-5" />
        </button>
      </div>
    </Transition>

    <!-- Global Notifications & Modals -->
    <ToastContainer />
    <ConfirmModal />
    <LoginModal />
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter, RouterLink, RouterView } from 'vue-router';
import {
  Clock as ClockIcon,
  KeyRound as KeyRoundIcon,
  ShieldCheck as ShieldCheckIcon,
  LogOut as LogOutIcon,
  Plus as PlusIcon,
  UploadCloud as UploadCloudIcon,
  PenSquare as PenSquareIcon,
} from 'lucide-vue-next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useUiStore, type QuickCreateTarget } from '@/shared/stores/ui.store';
import LoginModal from '@/features/auth/components/LoginModal.vue';
import ToastContainer from '@/shared/components/ui/ToastContainer.vue';
import ConfirmModal from '@/shared/components/ui/ConfirmModal.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const uiStore = useUiStore();

interface NavItem {
  roman: string;
  title: string;
  shortTitle: string;
  path: string;
  altPaths?: string[];
}

const navItems: NavItem[] = [
  { roman: 'I.', title: '时光纪流', shortTitle: '时光', path: '/', altPaths: ['/timeline'] },
  { roman: 'II.', title: '影像长廊', shortTitle: '影像', path: '/media' },
  { roman: 'III.', title: '随想手札', shortTitle: '手札', path: '/journal' },
];

const quickActions: { label: string; target: QuickCreateTarget; route: string; icon: any }[] = [
  { label: '记录时光条目', target: 'entry', route: '/', icon: ClockIcon },
  { label: '直传摄影胶片', target: 'photo', route: '/media', icon: UploadCloudIcon },
  { label: '撰写随想手札', target: 'journal', route: '/journal', icon: PenSquareIcon },
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
</script>
