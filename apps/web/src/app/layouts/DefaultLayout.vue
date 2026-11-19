<template>
  <div class="min-h-screen bg-[#F7F5F0] text-[#1D1C1A] flex flex-col relative selection:bg-[#C25438]/20 selection:text-[#C25438]">
    <!-- ========================================================= -->
    <!-- TOP STICKY CAPSULE NAVIGATION (Bento Header)              -->
    <!-- ========================================================= -->
    <header class="sticky top-0 z-40 bg-[#F7F5F0]/90 backdrop-blur-md border-b border-[#E5E1D8] transition-all">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <!-- Left: Archival Brand Mark -->
        <RouterLink to="/" class="flex items-center gap-3 group">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#E5E1D8] shadow-sm text-[#C25438] group-hover:border-[#C25438]/50 group-hover:scale-105 transition-all"
          >
            <ArchiveIcon class="w-4 h-4" />
          </div>
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="font-serif font-medium text-base tracking-tight text-[#1D1C1A] group-hover:text-[#C25438] transition-colors">
                Personal Archive
              </span>
              <span
                class="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider bg-[#EFECE4] text-[#747169] border border-[#E5E1D8]"
              >
                VOL. I
              </span>
            </div>
            <span class="text-[10px] text-[#9E9B93] font-mono tracking-wider flex items-center gap-1.5">
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="authStore.isAdmin ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-[#C25438]'"
              ></span>
              {{ authStore.isAdmin ? '已解锁管理员' : '公开只读展览 · OCCURRED AT' }}
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
                ? 'bg-white text-[#1D1C1A] font-semibold shadow-sm border border-[#E5E1D8]'
                : 'text-[#747169] hover:text-[#1D1C1A] hover:bg-white/50',
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

        <!-- Right: Clock, Admin Keyhole & Quick Action -->
        <div class="flex items-center gap-3">
          <!-- Time indicator -->
          <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 border border-[#E5E1D8] font-mono text-[11px] text-[#747169]">
            <ClockIcon class="w-3 h-3 text-[#9E9B93]" />
            <span>{{ liveTimeString }}</span>
          </div>

          <!-- If Admin: User Pill + Logout -->
          <div v-if="authStore.isAdmin" class="flex items-center gap-2">
            <span class="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-xs">
              <ShieldCheckIcon class="w-3.5 h-3.5 text-emerald-600" />
              <span>{{ authStore.user?.displayName || 'Archivist' }}</span>
            </span>
            <button
              type="button"
              class="flex items-center justify-center h-8 w-8 rounded-lg bg-white border border-[#E5E1D8] text-[#747169] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
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
            class="flex items-center justify-center h-8 w-8 rounded-lg bg-white border border-[#E5E1D8] text-[#747169] hover:text-[#C25438] hover:border-[#C25438]/40 hover:bg-[#FDF8F6] transition-all shadow-sm"
            @click="authStore.openLoginModal"
            title="管理员暗门 (快捷键: Ctrl + Shift + L)"
          >
            <KeyRoundIcon class="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>

    <!-- ========================================================= -->
    <!-- MAIN CONTENT VIEWPORT (Bento Canvas)                      -->
    <!-- ========================================================= -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-28 md:pb-16">
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
            @click="authStore.openLoginModal"
          >
            {{ authStore.isAdmin ? '管理控制台' : 'Archivist Gateway' }}
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

        <!-- 5th Mobile Tab: Secret Entry -->
        <button
          type="button"
          class="flex flex-col items-center justify-center flex-1 py-1 transition-colors"
          :class="authStore.isAdmin ? 'text-emerald-700' : 'text-[#747169] hover:text-[#C25438]'"
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
          class="flex h-12 w-12 items-center justify-center rounded-full bg-[#C25438] text-white shadow-xl shadow-[#C25438]/30 active:scale-95 transition-transform"
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
import { ref, onMounted, onUnmounted } from 'vue';
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
  { title: '时光编年', path: '/', altPaths: ['/timeline'], icon: ClockIcon },
  { title: '影像长廊', path: '/media', icon: ImageIcon },
  { title: '随想手札', path: '/journal', icon: BookOpenIcon },
  { title: '足迹漫游', path: '/travel', icon: CompassIcon },
];

function isNavActive(item: NavItem): boolean {
  if (route.path === item.path) return true;
  if (item.altPaths && item.altPaths.includes(route.path)) return true;
  return false;
}

async function handleLogout(): Promise<void> {
  await authStore.logout();
}

// Live Time Display
const liveTimeString = ref('');
let timer: number | null = null;

function updateLiveTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  liveTimeString.value = `${hours}:${minutes}:${seconds} CST`;
}

onMounted(() => {
  updateLiveTime();
  timer = window.setInterval(updateLiveTime, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>
