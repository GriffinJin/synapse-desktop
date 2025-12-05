<template>
  <div>
    <PageHeader title="Environments" subtitle="Detected development environments and tools" />
    
    <div class="toolbar mb-20">
      <vscode-button @click="refreshEnv" :disabled="loading">
        <span class="codicon codicon-refresh"></span> Refresh
      </vscode-button>
    </div>

    <!-- Installed Environments -->
    <div v-if="installedEnvs.length > 0" class="env-section">
      <h3 class="section-title">
        <span class="codicon codicon-check"></span> Installed ({{ installedEnvs.length }})
      </h3>
      <div class="env-grid">
        <div v-for="env in installedEnvs" :key="env.name" class="env-card installed">
          <div class="env-card-header">
            <span :class="['codicon', env.icon]" :style="{ color: env.color || 'var(--vscode-accent)' }"></span>
            <div class="env-name">{{ env.name }}</div>
            <span class="status-badge installed">Installed</span>
          </div>
          <div class="env-card-body">
            <div class="env-detail">
              <span class="label">Version:</span>
              <span class="value version">{{ env.version }}</span>
            </div>
            <div class="env-detail">
              <span class="label">Path:</span>
              <span class="value path" :title="env.path">{{ env.path }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Not Installed Environments (Collapsed) -->
    <div v-if="notInstalledEnvs.length > 0" class="env-section">
      <div class="section-header" @click="toggleNotInstalled">
        <h3 class="section-title">
          <span :class="['codicon', showNotInstalled ? 'codicon-chevron-down' : 'codicon-chevron-right']"></span>
          <span class="codicon codicon-x"></span> Not Installed ({{ notInstalledEnvs.length }})
        </h3>
      </div>
      <div v-if="showNotInstalled" class="env-grid">
        <div v-for="env in notInstalledEnvs" :key="env.name" class="env-card not-installed">
          <div class="env-card-header">
            <span :class="['codicon', env.icon]"></span>
            <div class="env-name">{{ env.name }}</div>
            <span class="status-badge not-found">Not Found</span>
          </div>
          <div class="env-card-body">
            <div class="env-detail">
              <span class="label">Command:</span>
              <span class="value">{{ env.command }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-overlay">
      <vscode-progress-ring></vscode-progress-ring>
      <span>Detecting environments...</span>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && environments.length === 0" class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <div class="empty-state-text">No environments detected</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import PageHeader from '../components/PageHeader.vue';

type Environment = {
  name: string;
  command: string;
  version: string | null;
  path: string | null;
  installed: boolean;
  icon: string;
  color?: string;
};

const environments = ref<Environment[]>([]);
const loading = ref(false);
const showNotInstalled = ref(false);

const installedEnvs = computed(() => 
  environments.value.filter(env => env.installed)
);

const notInstalledEnvs = computed(() => 
  environments.value.filter(env => !env.installed)
);

async function refreshEnv() {
  loading.value = true;
  try {
    const envs = await (window as any).system.getEnvVersions();
    environments.value = Array.isArray(envs) ? envs : [];
  } catch (e) {
    console.error('Failed to detect environments:', e);
    environments.value = [];
  } finally {
    loading.value = false;
  }
}

function toggleNotInstalled() {
  showNotInstalled.value = !showNotInstalled.value;
}

onMounted(async () => {
  await refreshEnv();
});
</script>

<style scoped>
.env-section {
  margin-bottom: 32px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-text);
  margin: 0 0 16px 0;
}

.section-header {
  cursor: pointer;
  user-select: none;
  transition: opacity 0.1s;
}

.section-header:hover {
  opacity: 0.8;
}

.env-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.env-card {
  background-color: var(--vscode-sidebar-bg);
  border: 1px solid var(--vscode-border);
  border-radius: 2px;
  overflow: hidden;
  transition: all 0.2s;
}

.env-card.installed {
  border-left: 3px solid var(--vscode-success);
}

.env-card.not-installed {
  border-left: 3px solid var(--vscode-text-secondary);
  opacity: 0.7;
}

.env-card:hover {
  background-color: var(--vscode-hover-bg);
}

.env-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--vscode-header-bg);
  border-bottom: 1px solid var(--vscode-border);
}

.env-card-header .codicon {
  font-size: 24px;
  flex-shrink: 0;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.installed {
  background-color: rgba(137, 209, 133, 0.2);
  color: var(--vscode-success);
}

.status-badge.not-found {
  background-color: rgba(244, 135, 113, 0.2);
  color: var(--vscode-error);
}

.env-name {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
  color: var(--vscode-text);
}

.env-card-body {
  padding: 16px;
}

.env-detail {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 12px;
}

.env-detail:last-child {
  margin-bottom: 0;
}

.env-detail .label {
  font-weight: 600;
  color: var(--vscode-text-secondary);
  min-width: 60px;
}

.env-detail .value {
  flex: 1;
  color: var(--vscode-text);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.env-detail .value.version {
  color: var(--vscode-success);
  font-weight: 600;
}

.env-detail .value.path {
  color: var(--vscode-info);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  background-color: var(--vscode-sidebar-bg);
  padding: 32px;
  border: 1px solid var(--vscode-border);
  border-radius: 2px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.loading-overlay span {
  color: var(--vscode-text);
  font-size: 13px;
}

.codicon-refresh::before { content: '\eb79'; }
.codicon-check::before { content: '\eb34'; }
.codicon-x::before { content: '\eb90'; }
.codicon-chevron-down::before { content: '\eb36'; }
.codicon-chevron-right::before { content: '\eb37'; }
.codicon-file-code::before { content: '\eb44'; }
.codicon-package::before { content: '\eb77'; }
.codicon-git-commit::before { content: '\eb48'; }
.codicon-server::before { content: '\eb50'; }
.codicon-snake::before { content: '\eb6f'; }
.codicon-symbol-method::before { content: '\eb65'; }
.codicon-symbol-interface::before { content: '\eb61'; }
.codicon-symbol-struct::before { content: '\eb68'; }
</style>