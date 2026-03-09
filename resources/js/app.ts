import './bootstrap';

import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => registration.update())
            .catch((error) => {
                console.error('Service worker registration failed:', error);
            });
    });
}

createApp(App)
    .use(createPinia())
    .use(router)
    .mount('#app');
