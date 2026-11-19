import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './app/router';
import { useAuthStore } from './features/auth/stores/auth.store';
import './app/styles/main.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Initialize user authentication session from stored token
const authStore = useAuthStore();
authStore.initAuth().catch((err) => {
  console.warn('[Archive] Failed to restore auth session:', err);
});

app.mount('#app');
