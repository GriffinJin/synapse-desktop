import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import WorkspacePage from './pages/WorkspacePage.vue';
import MavenPage from './pages/MavenPage.vue';
import EnvironmentsPage from './pages/EnvironmentsPage.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/workspace' },
  { path: '/workspace', name: 'workspace', component: WorkspacePage },
  { path: '/maven', name: 'maven', component: MavenPage },
  { path: '/env', name: 'env', component: EnvironmentsPage },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;