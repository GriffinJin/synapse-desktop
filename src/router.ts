import { createRouter, createWebHashHistory } from 'vue-router';
import WorkspacePage from './pages/WorkspacePage.vue';
import MavenPage from './pages/MavenPage.vue';
import EnvPage from './pages/EnvPage.vue';

const routes = [
  { path: '/', redirect: '/workspace', name: 'root' },
  { path: '/workspace', name: 'workspace', component: WorkspacePage },
  { path: '/maven', name: 'maven', component: MavenPage },
  { path: '/env', name: 'env', component: EnvPage },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;