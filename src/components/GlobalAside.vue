<template>
  <nav class="nav-menu">
    <div 
      v-for="item in menuItems" 
      :key="item.path"
      :class="['nav-item', { active: activeMenu === item.path }]"
      @click="navigate(item.path)"
    >
      <span class="nav-icon">
        <span :class="['codicon', item.icon]"></span>
      </span>
      <span>{{ item.label }}</span>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const activeMenu = computed(() => route.path);

const menuItems = [
  { path: '/workspace', label: 'Workspace', icon: 'codicon-folder' },
  { path: '/maven', label: 'Maven', icon: 'codicon-package' },
  { path: '/env', label: 'Environments', icon: 'codicon-settings' },
  { path: '/database', label: 'Database', icon: 'codicon-database' },
  { path: '/migration', label: 'Repository Migration', icon: 'codicon-repo-clone' },
];

function navigate(path: string) {
  router.push(path);
}
</script>

<style scoped>
.nav-menu {
  padding: 8px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  color: var(--vscode-text-secondary);
  transition: background-color 0.1s;
  user-select: none;
  font-size: 13px;
}

.nav-item:hover {
  background-color: var(--vscode-hover-bg);
  color: var(--vscode-text);
}

.nav-item.active {
  background-color: var(--vscode-selection-bg);
  color: var(--vscode-text);
}

.nav-icon {
  margin-right: 8px;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.codicon {
  font-family: codicon;
  font-size: 16px;
}

.codicon-folder::before { content: '\eB45'; }
.codicon-package::before { content: '\eB77'; }
.codicon-settings::before { content: '\eB52'; }
.codicon-database::before { content: '\eB06'; }
.codicon-repo-clone::before { content: '\eb5d'; }
</style>
