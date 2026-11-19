<template>
  <div class="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-40 pointer-events-none">
    <!-- SW Update Available Notification -->
    <Transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="needRefresh"
        class="pointer-events-auto mb-3 rounded-2xl border border-[#C25438]/30 bg-white/95 p-4 shadow-xl backdrop-blur-xl flex items-center justify-between gap-3 text-sm text-[#1D1C1A]"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FDF8F6] border border-[#F0D5CD] text-[#C25438]">
            <RefreshCwIcon class="w-4 h-4 animate-spin" />
          </div>
          <div>
            <p class="font-medium text-[#1D1C1A] text-xs sm:text-sm">发现档案馆新版本</p>
            <p class="text-[11px] text-[#747169]">点击刷新以加载最新功能与离线资源</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            class="rounded-lg bg-[#C25438] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A9442C] transition-colors"
            @click="handleUpdate"
          >
            刷新
          </button>
          <button
            type="button"
            class="rounded-lg p-1 text-[#9E9B93] hover:text-[#1D1C1A] transition-colors"
            @click="needRefresh = false"
          >
            <XIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </Transition>

    <!-- PWA Install Prompt Banner -->
    <Transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="canInstall && !isDismissed && !isStandalone"
        class="pointer-events-auto rounded-2xl border border-[#E5E1D8] bg-white/95 p-4 shadow-xl backdrop-blur-xl flex items-center justify-between gap-3 text-sm text-[#1D1C1A]"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7F5F0] border border-[#E5E1D8] text-[#C25438]">
            <DownloadCloudIcon class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <p class="font-serif font-medium text-[#1D1C1A] text-xs sm:text-sm truncate">添加为独立档案馆应用</p>
            <p class="text-[11px] text-[#747169] truncate">支持离线浏览与独立全屏窗口体验</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            class="rounded-xl bg-[#C25438] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A9442C] shadow-xs transition-colors active:scale-95"
            @click="handleInstallClick"
          >
            添加
          </button>
          <button
            type="button"
            class="rounded-lg p-1 text-[#9E9B93] hover:text-[#1D1C1A] transition-colors"
            @click="dismissPrompt"
            title="暂不需要"
          >
            <XIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  X as XIcon,
  RefreshCw as RefreshCwIcon,
  DownloadCloud as DownloadCloudIcon,
} from 'lucide-vue-next';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const canInstall = ref(false);
const isDismissed = ref(false);
const isStandalone = ref(false);
const needRefresh = ref(false);
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

try {
  // @ts-ignore
  import('virtual:pwa-register/vue').then(({ useRegisterSW }) => {
    const sw = useRegisterSW({
      immediate: true,
      onNeedRefresh() {
        needRefresh.value = true;
      },
      onOfflineReady() {
        console.log('[PWA] App ready to work offline');
      },
    });
    needRefresh.value = sw.needRefresh.value;
    updateSW = sw.updateServiceWorker;
  }).catch(() => {
    // Vite virtual module not available in test or ssr
  });
} catch {
  // No-op
}

function checkStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function handleBeforeInstallPrompt(e: Event): void {
  e.preventDefault();
  deferredPrompt.value = e as BeforeInstallPromptEvent;
  canInstall.value = true;
}

function handleAppInstalled(): void {
  canInstall.value = false;
  deferredPrompt.value = null;
}

async function handleInstallClick(): Promise<void> {
  if (!deferredPrompt.value) return;
  await deferredPrompt.value.prompt();
  const choice = await deferredPrompt.value.userChoice;
  if (choice.outcome === 'accepted') {
    canInstall.value = false;
  }
  deferredPrompt.value = null;
}

function dismissPrompt(): void {
  isDismissed.value = true;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('archive_pwa_dismissed', '1');
  }
}

async function handleUpdate(): Promise<void> {
  if (updateSW) {
    await updateSW(true);
  } else {
    window.location.reload();
  }
}

onMounted(() => {
  isStandalone.value = checkStandalone();
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('archive_pwa_dismissed') === '1') {
    isDismissed.value = true;
  }

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);
});

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.removeEventListener('appinstalled', handleAppInstalled);
});
</script>
