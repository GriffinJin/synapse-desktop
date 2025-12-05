<template>
  <div>
    <PageHeader title="Repository Migration" subtitle="Migrate Git repositories from source to target directory" />
    
    <div class="migration-container">
      <!-- Source Directory Section -->
      <div class="directory-panel">
        <div class="panel-header">
          <h3>Source Directory</h3>
          <vscode-button @click="chooseSourceDir" :disabled="scanning">
            <span class="codicon codicon-folder-opened"></span> Browse
          </vscode-button>
        </div>
        
        <div v-if="sourceDir" class="selected-path">
          <span class="codicon codicon-folder"></span>
          <span class="path-text">{{ sourceDir }}</span>
        </div>
        
        <div v-if="sourceRepos.length > 0" class="repo-list">
          <div class="list-header">
            <span>Found {{ sourceRepos.length }} repositories</span>
          </div>
          <div class="repo-items">
            <div v-for="repo in sourceRepos" :key="repo.path" class="repo-item">
              <span class="codicon codicon-repo"></span>
              <div class="repo-info">
                <div class="repo-name">{{ repo.name }}</div>
                <div class="repo-path">{{ repo.path }}</div>
                <div class="repo-meta">
                  <span v-if="repo.branch" class="branch-info">
                    <span class="codicon codicon-git-branch"></span> {{ repo.branch }}
                  </span>
                  <div class="repo-flags">
                    <span v-if="repo.unstaged" class="repo-flag flag-unstaged">Unstaged</span>
                    <span v-if="repo.ahead" class="repo-flag flag-ahead">Ahead</span>
                    <span v-if="repo.behind" class="repo-flag flag-behind">Behind</span>
                    <span v-if="!repo.unstaged && !repo.ahead && !repo.behind" class="repo-flag flag-clean">Clean</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else-if="sourceDir && !scanning" class="empty-state">
          <div class="empty-state-icon">📁</div>
          <div class="empty-state-text">No repositories found in source directory</div>
        </div>
        
        <div v-else-if="!sourceDir" class="empty-state">
          <div class="empty-state-icon">👈</div>
          <div class="empty-state-text">Select a source directory to begin</div>
        </div>
      </div>

      <!-- Target Directory Section -->
      <div class="directory-panel">
        <div class="panel-header">
          <h3>Target Directory</h3>
          <vscode-button @click="chooseTargetDir" :disabled="scanning">
            <span class="codicon codicon-folder-opened"></span> Browse
          </vscode-button>
        </div>
        
        <div v-if="targetDir" class="selected-path">
          <span class="codicon codicon-folder"></span>
          <span class="path-text">{{ targetDir }}</span>
        </div>
        
        <div v-if="targetRepos.length > 0" class="repo-list">
          <div class="list-header">
            <span>Found {{ targetRepos.length }} repositories</span>
          </div>
          <div class="repo-items">
            <div v-for="repo in targetRepos" :key="repo.path" class="repo-item">
              <span class="codicon codicon-repo"></span>
              <div class="repo-info">
                <div class="repo-name">{{ repo.name }}</div>
                <div class="repo-path">{{ repo.path }}</div>
                <div class="repo-meta">
                  <span v-if="repo.branch" class="branch-info">
                    <span class="codicon codicon-git-branch"></span> {{ repo.branch }}
                  </span>
                  <div class="repo-flags">
                    <span v-if="repo.unstaged" class="repo-flag flag-unstaged">Unstaged</span>
                    <span v-if="repo.ahead" class="repo-flag flag-ahead">Ahead</span>
                    <span v-if="repo.behind" class="repo-flag flag-behind">Behind</span>
                    <span v-if="!repo.unstaged && !repo.ahead && !repo.behind" class="repo-flag flag-clean">Clean</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else-if="targetDir && !scanning" class="empty-state">
          <div class="empty-state-icon">📁</div>
          <div class="empty-state-text">No repositories found in target directory</div>
        </div>
        
        <div v-else-if="!targetDir" class="empty-state">
          <div class="empty-state-icon">👉</div>
          <div class="empty-state-text">Select a target directory</div>
        </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <div class="action-info">
        <span v-if="sourceRepos.length > 0 && targetDir">
          Ready to migrate {{ sourceRepos.length }} repositories
        </span>
        <span v-else class="muted">
          Select both source and target directories to continue
        </span>
      </div>
      <div class="action-buttons">
        <vscode-button 
          @click="clearSelection" 
          appearance="secondary"
          :disabled="!sourceDir && !targetDir"
        >
          Clear
        </vscode-button>
        <vscode-button 
          appearance="primary" 
          :disabled="!sourceDir || !targetDir || sourceRepos.length === 0 || scanning"
        >
          <span class="codicon codicon-sync"></span> Sync Repositories
        </vscode-button>
      </div>
    </div>

    <!-- Loading Indicator -->
    <div v-if="scanning" class="loading-overlay">
      <vscode-progress-ring></vscode-progress-ring>
      <span>Scanning directories...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '../components/PageHeader.vue';

type RepoInfo = {
  name: string;
  path: string;
  origin: string | null;
  branch: string | null;
  ahead: boolean;
  behind: boolean;
  unstaged: boolean;
};

const sourceDir = ref<string>('');
const targetDir = ref<string>('');
const sourceRepos = ref<RepoInfo[]>([]);
const targetRepos = ref<RepoInfo[]>([]);
const scanning = ref(false);

async function chooseSourceDir() {
  try {
    const dir = await (window as any).workspace?.chooseDir?.();
    if (dir) {
      sourceDir.value = dir;
      await scanSourceDirectory();
    }
  } catch (e: any) {
    alert(e?.message || 'Failed to choose source directory');
  }
}

async function chooseTargetDir() {
  try {
    const dir = await (window as any).workspace?.chooseDir?.();
    if (dir) {
      targetDir.value = dir;
      await scanTargetDirectory();
    }
  } catch (e: any) {
    alert(e?.message || 'Failed to choose target directory');
  }
}

async function scanSourceDirectory() {
  if (!sourceDir.value) return;
  
  scanning.value = true;
  try {
    const repos = await (window as any).workspace?.scanGitRepos?.(sourceDir.value);
    sourceRepos.value = Array.isArray(repos) ? repos : [];
    console.log(`Found ${sourceRepos.value.length} repositories in source directory`);
  } catch (e: any) {
    alert(e?.message || 'Failed to scan source directory');
    sourceRepos.value = [];
  } finally {
    scanning.value = false;
  }
}

async function scanTargetDirectory() {
  if (!targetDir.value) return;
  
  scanning.value = true;
  try {
    const repos = await (window as any).workspace?.scanGitRepos?.(targetDir.value);
    targetRepos.value = Array.isArray(repos) ? repos : [];
    console.log(`Found ${targetRepos.value.length} repositories in target directory`);
  } catch (e: any) {
    alert(e?.message || 'Failed to scan target directory');
    targetRepos.value = [];
  } finally {
    scanning.value = false;
  }
}

function clearSelection() {
  sourceDir.value = '';
  targetDir.value = '';
  sourceRepos.value = [];
  targetRepos.value = [];
}
</script>

<style scoped>
.migration-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.directory-panel {
  background-color: var(--vscode-sidebar-bg);
  border: 1px solid var(--vscode-border);
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  min-height: 500px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--vscode-border);
  background-color: var(--vscode-header-bg);
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-text);
}

.selected-path {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: var(--vscode-input-bg);
  border-bottom: 1px solid var(--vscode-border);
  font-family: monospace;
  font-size: 12px;
  color: var(--vscode-info);
}

.path-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repo-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-border);
  font-size: 12px;
  color: var(--vscode-text-secondary);
  background-color: var(--vscode-bg);
}

.repo-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.repo-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background-color: var(--vscode-bg);
  border: 1px solid var(--vscode-border);
  border-radius: 2px;
  transition: background-color 0.1s;
}

.repo-item:hover {
  background-color: var(--vscode-hover-bg);
}

.repo-item > .codicon {
  font-size: 20px;
  color: var(--vscode-accent);
  flex-shrink: 0;
  margin-top: 2px;
}

.repo-info {
  flex: 1;
  min-width: 0;
}

.repo-name {
  font-weight: 600;
  color: var(--vscode-text);
  margin-bottom: 4px;
  font-size: 13px;
}

.repo-path {
  font-size: 11px;
  color: var(--vscode-text-secondary);
  font-family: monospace;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repo-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.branch-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--vscode-info);
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: var(--vscode-sidebar-bg);
  border: 1px solid var(--vscode-border);
  border-radius: 2px;
}

.action-info {
  font-size: 13px;
  color: var(--vscode-text);
}

.action-buttons {
  display: flex;
  gap: 8px;
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

.codicon-folder-opened::before { content: '\eb4b'; }
.codicon-folder::before { content: '\eb45'; }
.codicon-repo::before { content: '\eb7c'; }
.codicon-git-branch::before { content: '\eb49'; }
.codicon-sync::before { content: '\eb6e'; }
</style>
