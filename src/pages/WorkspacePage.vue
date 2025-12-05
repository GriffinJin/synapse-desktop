<template>
  <div>
    <PageHeader title="Workspace" subtitle="Select a directory to discover Git repositories" />
    <div class="toolbar mb-20">
      <div style="display: flex; gap: 12px; flex: 1;">
        <vscode-dropdown style="min-width: 300px;" @change="onWorkspaceDropdownChange">
          <vscode-option v-for="w in knownWorkspaces" :key="w.root" :value="w.root">{{ w.root }}</vscode-option>
        </vscode-dropdown>
        <vscode-button @click="chooseWorkspaceRoot" :disabled="scanning">Browse</vscode-button>
        <vscode-button v-if="repos.length" appearance="icon" @click="refreshRepos" :disabled="scanning" title="Refresh">
          <span class="codicon codicon-refresh"></span>
        </vscode-button>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <label style="font-size: 12px; color: var(--vscode-text-secondary);">View Mode:</label>
        <vscode-radio-group @change="onViewModeChange">
          <vscode-radio value="operations" :checked="workspaceViewMode === 'operations'">Operations</vscode-radio>
          <vscode-radio value="details" :checked="workspaceViewMode === 'details'">Details</vscode-radio>
        </vscode-radio-group>
      </div>
    </div>

    <template v-if="repos.length">
      <!-- Operations View -->
      <div v-if="workspaceViewMode === 'operations'" class="data-grid-container">
        <table class="vscode-table">
          <thead>
            <tr>
              <th style="width: 48px;"></th>
              <th>Repository</th>
              <th>Remote URL</th>
              <th style="width: 160px;">Branch</th>
              <th style="width: 220px;">Status</th>
              <th style="width: 200px;">Operations</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in repos" :key="row.path">
              <td><vscode-checkbox @change="(e) => toggleRepoSelection(row, e)" /></td>
              <td>{{ row.name }}</td>
              <td>{{ row.origin || 'no remote' }}</td>
              <td>{{ row.branch || 'unknown' }}</td>
              <td>
                <div class="repo-flags">
                  <span v-if="row.unstaged" class="repo-flag flag-unstaged">Unstaged</span>
                  <span v-if="row.ahead" class="repo-flag flag-ahead">Ahead</span>
                  <span v-if="row.behind" class="repo-flag flag-behind">Behind</span>
                  <span v-if="!row.unstaged && !row.ahead && !row.behind" class="repo-flag flag-clean">Clean</span>
                </div>
              </td>
              <td>
                <vscode-button appearance="icon" @click="pullRepo(row.path)" title="git fetch & pull">
                  <span class="codicon codicon-cloud-download"></span>
                </vscode-button>
                <vscode-button @click="openRepoDetails(row.path)">Details</vscode-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Details View -->
      <div v-else>
        <div v-for="repo in repos" :key="repo.path" class="accordion-item">
          <div class="accordion-header" @click="toggleRepoPanel(repo.path)">
            <div class="repo-summary">
              <div class="repo-title">{{ repo.name }}</div>
              <div class="repo-meta">
                <span class="repo-branch">Branch: {{ repo.branch || 'unknown' }}</span>
                <span class="status-sep"> | </span>
                <span class="repo-path">{{ repo.path }}</span>
              </div>
              <div class="repo-flags">
                <span v-if="repo.unstaged" class="repo-flag flag-unstaged">Unstaged</span>
                <span v-if="repo.ahead" class="repo-flag flag-ahead">Ahead</span>
                <span v-if="repo.behind" class="repo-flag flag-behind">Behind</span>
                <span v-if="!repo.unstaged && !repo.ahead && !repo.behind" class="repo-flag flag-clean">Clean</span>
              </div>
            </div>
            <span class="codicon" :class="activeRepoPanels.includes(repo.path) ? 'codicon-chevron-down' : 'codicon-chevron-right'"></span>
          </div>
          <div v-if="activeRepoPanels.includes(repo.path)" class="accordion-content">
            <div class="repo-detail">
              <div class="repo-detail-row"><span class="label">Repository</span><span class="value">{{ repo.name }}</span></div>
              <div class="repo-detail-row"><span class="label">Path</span><span class="value">{{ repo.path }}</span></div>
              <div class="repo-detail-row"><span class="label">Branch</span><span class="value">{{ repo.branch || 'unknown' }}</span></div>
              <div class="repo-detail-row"><span class="label">Status</span><span class="value">
                  <span v-if="repo.unstaged" class="repo-flag flag-unstaged">Unstaged</span>
                  <span v-if="repo.ahead" class="repo-flag flag-ahead">Ahead</span>
                  <span v-if="repo.behind" class="repo-flag flag-behind">Behind</span>
                  <span v-if="!repo.unstaged && !repo.ahead && !repo.behind" class="repo-flag flag-clean">Clean</span>
                </span></div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="empty-state">
      <div class="empty-state-icon">📁</div>
      <div class="empty-state-text">No repositories found</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
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

const workspaceRoot = ref<string>('');
const repos = ref<RepoInfo[]>([]);
const scanning = ref(false);
const activeRepoPanels = ref<string[]>([]);
const workspaceViewMode = ref<'details' | 'operations'>('operations');
const selectedRepoPaths = ref<string[]>([]);
const knownWorkspaces = ref<Array<{ root: string; lastScan: string; count: number }>>([]);

async function chooseWorkspaceRoot() {
  try {
    const dir = await (window as any).workspace?.chooseDir?.();
    if (dir) {
      workspaceRoot.value = dir;
      await scanWorkspace();
    }
  } catch (e: any) {
    alert(e?.message || 'Failed to choose directory');
  }
}

async function scanWorkspace() {
  if (!workspaceRoot.value) {
    alert('Please choose a directory');
    return;
  }
  scanning.value = true;
  try {
    repos.value = await (window as any).workspace?.scanGitRepos?.(workspaceRoot.value);
    try {
      await (window as any).workspaceCache?.set?.(workspaceRoot.value, repos.value);
    } catch { }
    await refreshKnownWorkspaces();
    const count = Array.isArray(repos.value) ? repos.value.length : 0;
    if (count > 0) {
      console.log(`Scan Completed: Found ${count} Git repositories`);
    } else {
      console.log('Scan Completed: No repositories found');
    }
  } catch (e: any) {
    alert(e?.message || 'Failed to scan workspace');
  } finally {
    scanning.value = false;
  }
}

async function refreshRepos() {
  await scanWorkspace();
}

async function pullRepo(repoPath: string) {
  try {
    scanning.value = true;
    await (window as any).workspace?.pullRepo?.(repoPath);
    console.log(`Success: Pulled ${repoPath}`);
    // Refresh the repo data after pulling
    await scanWorkspace();
  } catch (e: any) {
    alert(e?.message || `Failed to pull ${repoPath}`);
  } finally {
    scanning.value = false;
  }
}

async function batchPull() {
  if (selectedRepoPaths.value.length === 0) {
    alert('Please select at least one repository');
    return;
  }

  try {
    scanning.value = true;
    const promises = selectedRepoPaths.value.map(path =>
      (window as any).workspace?.pullRepo?.(path)
    );

    await Promise.all(promises);

    console.log(`Success: Pulled ${selectedRepoPaths.value.length} repositories`);

    // Refresh the repo data after pulling
    await scanWorkspace();
  } catch (e: any) {
    alert(e?.message || 'Failed to pull some repositories');
  } finally {
    scanning.value = false;
  }
}

async function refreshKnownWorkspaces() {
  try {
    const list = await (window as any).workspaceCache?.list?.();
    knownWorkspaces.value = Array.isArray(list) ? list : [];
  } catch {
    knownWorkspaces.value = [];
  }
}

async function onWorkspaceSelected(newRoot: string) {
  if (!newRoot) {
    repos.value = [];
    return;
  }
  try {
    const cached = await (window as any).workspaceCache?.get?.(newRoot);
    if (Array.isArray(cached) && cached.length > 0) {
      repos.value = cached;
    } else {
      await scanWorkspace();
    }
  } catch {
    await scanWorkspace();
  }
}

function openRepoDetails(repoPath: string) {
  workspaceViewMode.value = 'details';
  activeRepoPanels.value = [repoPath];
}

function onRepoSelectionChange(selection: RepoInfo[]) {
  selectedRepoPaths.value = selection.map(r => r.path);
}

function toggleRepoSelection(row: RepoInfo, event: any) {
  const isChecked = event.target.checked;
  if (isChecked) {
    if (!selectedRepoPaths.value.includes(row.path)) {
      selectedRepoPaths.value.push(row.path);
    }
  } else {
    const index = selectedRepoPaths.value.indexOf(row.path);
    if (index > -1) {
      selectedRepoPaths.value.splice(index, 1);
    }
  }
}

function toggleRepoPanel(repoPath: string) {
  const index = activeRepoPanels.value.indexOf(repoPath);
  if (index > -1) {
    activeRepoPanels.value.splice(index, 1);
  } else {
    activeRepoPanels.value.push(repoPath);
  }
}

function onWorkspaceDropdownChange(event: any) {
  const newRoot = event.target.value;
  workspaceRoot.value = newRoot;
  onWorkspaceSelected(newRoot);
}

function onViewModeChange(event: any) {
  const value = event.target.value;
  workspaceViewMode.value = value === 'details' ? 'details' : 'operations';
}

onMounted(async () => {
  await refreshKnownWorkspaces();
});
</script>

<style scoped>
.vscode-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--vscode-sidebar-bg);
  font-size: 13px;
}

.vscode-table th,
.vscode-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--vscode-border);
}

.vscode-table th {
  background-color: var(--vscode-header-bg);
  font-weight: 600;
  color: var(--vscode-text);
  border-bottom: 1px solid var(--vscode-border);
}

.vscode-table td {
  color: var(--vscode-text);
}

.vscode-table tr:hover {
  background-color: var(--vscode-hover-bg);
}

.repo-summary {
  flex: 1;
}

.repo-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--vscode-text);
}

.repo-meta {
  font-size: 12px;
  color: var(--vscode-text-secondary);
  margin-bottom: 8px;
}

.repo-branch {
  color: var(--vscode-info);
}

.repo-path {
  font-family: monospace;
}

.status-sep {
  margin: 0 8px;
  color: var(--vscode-border);
}

.repo-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.repo-detail-row {
  display: flex;
  gap: 16px;
  font-size: 13px;
}

.repo-detail-row .label {
  font-weight: 600;
  min-width: 100px;
  color: var(--vscode-text);
}

.repo-detail-row .value {
  color: var(--vscode-text-secondary);
}

.codicon-refresh::before { content: '\eb79'; }
.codicon-cloud-download::before { content: '\eb40'; }
.codicon-chevron-down::before { content: '\eb36'; }
.codicon-chevron-right::before { content: '\eb37'; }
</style>