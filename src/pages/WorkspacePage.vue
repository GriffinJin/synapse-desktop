<template>
  <div>
    <PageHeader title="Workspace" subtitle="Select a directory to discover Git repositories" />
    <el-row style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-select v-model="workspaceRoot" placeholder="Select a workspace" filterable clearable
          @change="onWorkspaceSelected">
          <el-option v-for="w in knownWorkspaces" :key="w.root" :label="w.root" :value="w.root" />
        </el-select>
      </el-col>
      <el-col :span="6">
        <el-button type="primary" @click="chooseWorkspaceRoot" :loading="scanning"
          style="margin-left: 10px;">Browse</el-button>
        <el-button v-if="repos.length" circle @click="refreshRepos" :loading="scanning" style="margin-left: 10px;"
          :icon="RefreshRight"></el-button>
      </el-col>
      <el-col :span="12" style="text-align: end;">
        <el-switch v-model="workspaceViewMode" :active-value="'details'" :inactive-value="'operations'"
          active-text="Details" inactive-text="Operations" />
      </el-col>
    </el-row>

    <template v-if="repos.length">
      <!-- Operations View -->
      <div v-if="workspaceViewMode === 'operations'">
        <el-table :data="repos" border row-key="path" @selection-change="onRepoSelectionChange">
          <el-table-column type="selection" width="48" />
          <el-table-column prop="name" label="Repository" min-width="200" />
          <el-table-column label="Remote URL" min-width="320">
            <template #default="{ row }">
              <span>{{ row.origin || 'no remote' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="branch" label="Branch" width="160">
            <template #default="{ row }">
              <span>{{ row.branch || 'unknown' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Status" min-width="220">
            <template #default="{ row }">
              <div class="repo-flags">
                <span v-if="row.unstaged" class="repo-flag flag-unstaged">Unstaged</span>
                <span v-if="row.ahead" class="repo-flag flag-ahead">Ahead</span>
                <span v-if="row.behind" class="repo-flag flag-behind">Behind</span>
                <span v-if="!row.unstaged && !row.ahead && !row.behind" class="repo-flag flag-clean">Clean</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="Operations" width="200">
            <template #default="{ row }">
              <el-tooltip content="git fetch & pull" placement="top">
                 <el-button text @click="pullRepo(row.path)" :icon="Download"></el-button>
              </el-tooltip>
        
              <el-button size="small" type="primary" plain @click="openRepoDetails(row.path)">Details</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Details View -->
      <el-collapse v-else v-model="activeRepoPanels">
        <el-collapse-item v-for="repo in repos" :key="repo.path" :name="repo.path">
          <template #title>
            <div class="repo-summary">
              <div class="repo-title">{{ repo.name }}</div>
              <div class="repo-meta">
                <span class="repo-branch">Branch: {{ repo.branch || 'unknown' }}</span>
                <span class="status-sep">|</span>
                <span class="repo-path">{{ repo.path }}</span>
              </div>
              <div class="repo-flags">
                <span v-if="repo.unstaged" class="repo-flag flag-unstaged">Unstaged</span>
                <span v-if="repo.ahead" class="repo-flag flag-ahead">Ahead</span>
                <span v-if="repo.behind" class="repo-flag flag-behind">Behind</span>
                <span v-if="!repo.unstaged && !repo.ahead && !repo.behind" class="repo-flag flag-clean">Clean</span>
              </div>
            </div>
          </template>
          <div class="repo-detail">
            <div class="repo-detail-row"><span class="label">Repository</span><span class="value">{{ repo.name }}</span>
            </div>
            <div class="repo-detail-row"><span class="label">Path</span><span class="value">{{ repo.path }}</span></div>
            <div class="repo-detail-row"><span class="label">Branch</span><span class="value">{{ repo.branch ||'unknown'}}</span></div>
            <div class="repo-detail-row"><span class="label">Status</span><span class="value">
                <span v-if="repo.unstaged" class="repo-flag flag-unstaged">Unstaged</span>
                <span v-if="repo.ahead" class="repo-flag flag-ahead">Ahead</span>
                <span v-if="repo.behind" class="repo-flag flag-behind">Behind</span>
                <span v-if="!repo.unstaged && !repo.ahead && !repo.behind" class="repo-flag flag-clean">Clean</span>
              </span></div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </template>
    <el-empty v-else description="No repositories found" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import PageHeader from '../components/PageHeader.vue';
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus';
import { RefreshRight, Download } from '@element-plus/icons-vue';

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
    ElMessage.error(e?.message || 'Failed to choose directory');
  }
}

async function scanWorkspace() {
  if (!workspaceRoot.value) {
    ElNotification({ title: 'Workspace', message: 'Please choose a directory', type: 'info', duration: 2500 });
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
      ElNotification({ title: 'Scan Completed', message: `Found ${count} Git repositories`, type: 'success', duration: 3500 });
    } else {
      ElNotification({ title: 'Scan Completed', message: 'No repositories found', type: 'warning', duration: 3500 });
    }
  } catch (e: any) {
    ElNotification({ title: 'Scan Failed', message: e?.message || 'Failed to scan workspace', type: 'error', duration: 4500 });
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
    ElNotification({ title: 'Success', message: `Pulled ${repoPath}`, type: 'success', duration: 2500 });
    // Refresh the repo data after pulling
    await scanWorkspace();
  } catch (e: any) {
    ElNotification({ title: 'Error', message: e?.message || `Failed to pull ${repoPath}`, type: 'error', duration: 4500 });
  } finally {
    scanning.value = false;
  }
}

async function batchPull() {
  if (selectedRepoPaths.value.length === 0) {
    ElMessage.warning('Please select at least one repository');
    return;
  }

  try {
    scanning.value = true;
    const promises = selectedRepoPaths.value.map(path =>
      (window as any).workspace?.pullRepo?.(path)
    );

    await Promise.all(promises);

    ElNotification({
      title: 'Success',
      message: `Pulled ${selectedRepoPaths.value.length} repositories`,
      type: 'success',
      duration: 3500
    });

    // Refresh the repo data after pulling
    await scanWorkspace();
  } catch (e: any) {
    ElNotification({
      title: 'Error',
      message: e?.message || 'Failed to pull some repositories',
      type: 'error',
      duration: 4500
    });
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

onMounted(async () => {
  await refreshKnownWorkspaces();
});
</script>