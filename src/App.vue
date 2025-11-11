<template>
  <el-container class="app-root">
    <AppHeader
      @open-search="openSearch"
      @open-notifications="openNotifications"
      @open-settings="openSettings"
    />

    <el-container class="content-container">
      <!-- Sidebar: single-level menu with icons -->
      <el-aside :width="isAsideCollapsed ? '64px' : '220px'" :class="['aside', { collapsed: isAsideCollapsed }]">
        <el-menu :default-active="activeMenu" @select="onSelectMenu">
          <el-menu-item index="workspace">
            <el-icon><Folder /></el-icon>
            <span>Workspace</span>
          </el-menu-item>
          <el-menu-item index="maven">
            <el-icon><Collection /></el-icon>
            <span>Maven</span>
          </el-menu-item>
          <el-menu-item index="env">
            <el-icon><Setting /></el-icon>
            <span>Environments</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- Toggle button centered on the divider between aside and main -->
      <div class="aside-toggle no-drag" :style="{ left: asideWidth + 'px' }">
        <el-button circle size="small" @click="toggleAside" :title="isAsideCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
          <el-icon v-if="isAsideCollapsed"><Expand /></el-icon>
          <el-icon v-else><Fold /></el-icon>
        </el-button>
      </div>

      <!-- Main content -->
      <el-main class="main-scroll">
        <template v-if="activeMenu === 'workspace'">
          <MainHeader title="Workspace" subtitle="Select a directory to discover Git repositories"/>
          <div class="subnav">
            <el-tabs v-model="workspaceViewMode">
              <el-tab-pane label="Operations" name="operations" />
              <el-tab-pane label="Details" name="details" />
            </el-tabs>
          </div>

          <div class="workspace-body" v-loading="scanning" element-loading-text="Scanning repositories..." element-loading-background="rgba(255,255,255,0.6)">

            <div class="toolbar">
              <div class="toolbar-left">
                <!-- Workspace selector: choose from cached workspaces -->
                <el-select
                  v-model="workspaceRoot"
                  placeholder="Select a workspace"
                  class="toolbar-search"
                  filterable
                  clearable
                  @change="onWorkspaceSelected"
                >
                  <el-option
                    v-for="w in knownWorkspaces"
                    :key="w.root"
                    :label="w.root"
                    :value="w.root"
                  />
                </el-select>
              </div>
              <div class="toolbar-actions">
              <el-button @click="chooseWorkspaceRoot" :disabled="scanning">Choose Directory</el-button>
              <el-button type="primary" @click="scanWorkspace" :disabled="!workspaceRoot || scanning" :loading="scanning">Scan</el-button>
              </div>
            </div>

          <template v-if="repos.length">
            <el-collapse v-if="workspaceViewMode === 'details'" v-model="activeRepoPanels">
              <el-collapse-item
                v-for="repo in repos"
                :key="repo.path"
                :name="repo.path"
              >
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
              </el-collapse-item>
            </el-collapse>
            <el-table v-else :data="repos" border row-key="path" @selection-change="onRepoSelectionChange">
              <el-table-column type="selection" width="48" />
              <el-table-column prop="name" label="Repository" min-width="200" />
              <el-table-column label="Origin" min-width="320">
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
              <el-table-column label="Operations" width="160">
                <template #default="{ row }">
                  <el-button size="small" type="primary" plain @click="openRepoDetails(row.path)">Details</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
          <el-empty v-else description="No repositories found" />
          </div>
        </template>
        <template v-else-if="activeMenu === 'maven'">
          <div class="section-header">
            <h2>Maven Config Files (~/.m2/config)</h2>
            <span class="muted">Preview is enabled for .xml files</span>
          </div>

          <!-- Toolbar: search on the left, refresh/add buttons on the right -->
          <div class="toolbar">
            <el-input
              v-model="search"
              placeholder="Search by file name"
              clearable
              class="toolbar-search"
            />
            <div class="toolbar-actions">
              <el-button @click="refresh" :disabled="!hasM2">Refresh</el-button>
              <el-button type="primary" @click="openAddDialog" :disabled="!hasM2">Add</el-button>
            </div>
          </div>

          <el-table :data="filteredFiles" border>
            <el-table-column prop="name" label="Name" min-width="220" />
            <el-table-column prop="relativePath" label="Relative Path" min-width="280" />
            <el-table-column prop="size" label="Size" width="120">
              <template #default="{ row }">
                <span v-if="typeof row.size === 'number'">{{ formatSize(row.size) }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="160">
              <template #default="{ row }">
                <el-button size="small" type="primary" plain :disabled="!isXml(row.name)" @click="preview(row)">
                  Preview
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="filteredFiles.length === 0" description="No files found" />

          <el-dialog v-model="previewVisible" title="Preview XML" width="60%">
            <pre class="code">{{ content }}</pre>
            <template #footer>
              <el-button @click="previewVisible = false">Close</el-button>
            </template>
          </el-dialog>

          <!-- Add file dialog -->
          <el-dialog v-model="addVisible" title="Add XML File" width="600px">
            <el-form :model="addForm" label-width="100px">
              <el-form-item label="File Name">
                <el-input v-model="addForm.name" placeholder="example.xml" />
              </el-form-item>
              <el-form-item label="Content">
                <el-input v-model="addForm.content" type="textarea" :autosize="{ minRows: 6, maxRows: 12 }" />
              </el-form-item>
            </el-form>
            <template #footer>
              <el-button @click="addVisible = false">Cancel</el-button>
              <el-button type="primary" @click="submitAdd" :disabled="!hasM2">Create</el-button>
            </template>
          </el-dialog>
        </template>

        <template v-if="activeMenu === 'env'">
          <div class="section-header">
            <h2>Environments</h2>
            <span class="muted">Show versions of Java, Python, and Maven</span>
          </div>
          <div class="env-grid">
            <div class="env-item">
              <div class="env-label">Java</div>
              <div class="env-value">{{ envJavaText }}</div>
            </div>
            <div class="env-item">
              <div class="env-label">Python</div>
              <div class="env-value">{{ envPythonText }}</div>
            </div>
            <div class="env-item">
              <div class="env-label">Maven</div>
              <div class="env-value">{{ envMavenText }}</div>
            </div>
          </div>
          <div class="toolbar" style="margin-top: 12px;">
            <div></div>
            <div class="toolbar-actions">
              <el-button @click="refreshEnv" type="primary">Refresh</el-button>
            </div>
          </div>
        </template>
      </el-main>
      <!-- Settings overlay covering sidebar and main -->
      <div v-if="settingsOpen" class="settings-overlay no-drag">
        <div class="settings-header">
          <h2>Settings</h2>
          <el-button circle size="small" class="settings-close" @click="closeSettings" :title="'Close settings'">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <div class="settings-content">
          <el-empty description="Settings page (coming soon)" />
        </div>
      </div>
      <!-- Notifications overlay covering sidebar and main -->
      
    </el-container>
    <el-footer height="28px" class="statusbar">
      <div class="status-left">
        <!-- OS Chip -->
        <span class="status-chip">
          <el-icon><Monitor /></el-icon>
          <span class="chip-text">{{ osText }}</span>
        </span>
        <span class="status-sep">•</span>
        <!-- CPU Chip with threshold coloring and details popover -->
        <el-popover trigger="click" placement="top" width="260">
          <template #reference>
            <span :class="['status-chip', cpuStatusClass]">
              <el-icon><Cpu /></el-icon>
              <span class="chip-text">{{ cpuText }}</span>
            </span>
          </template>
          <div class="popover-content">
            <div class="popover-title">CPU Usage</div>
            <el-progress :percentage="cpuPercentDisplay" :status="cpuPercentDisplay > 80 ? 'warning' : 'success'" />
            <div class="popover-meta">Current: {{ cpuPercentDisplay }}%</div>
          </div>
        </el-popover>
        <span class="status-sep">•</span>
        <!-- Memory Chip with mini meter and details popover -->
        <el-popover trigger="click" placement="top" width="280">
          <template #reference>
            <span :class="['status-chip', memStatusClass]">
              <el-icon><TrendCharts /></el-icon>
              <span class="chip-text">{{ memText }}</span>
              <span class="mini-meter">
                <span class="mini-meter-fill" :style="{ width: memMeterWidth, backgroundColor: memColor }" />
              </span>
            </span>
          </template>
          <div class="popover-content">
            <div class="popover-title">Memory Usage</div>
            <el-progress :percentage="memPercentDisplay" :status="memPercentDisplay > 80 ? 'warning' : 'success'" />
            <div class="popover-meta">Used: {{ memUsedGB }} GB</div>
            <div class="popover-meta">Total: {{ memTotalGB }} GB</div>
            <div class="popover-meta">Percent: {{ memPercentDisplay }}%</div>
          </div>
        </el-popover>
      </div>
      <div class="status-right no-drag">
        <el-tooltip content="Keyboard Shortcuts" placement="top">
          <el-button class="shortcut-btn" size="small" type="text" @click="openShortcuts" :title="'Show keyboard shortcuts'">
            <el-icon><ArrowLeft /></el-icon>
            <span class="shortcut-text">Shortcuts</span>
          </el-button>
        </el-tooltip>
      </div>
    </el-footer>
    <!-- Quick Search dialog (English-only comments) -->
    <el-dialog v-model="searchOpen" title="Quick Search" width="420px" :close-on-click-modal="true" destroy-on-close>
      <el-input
        ref="quickInputRef"
        v-model="searchTerm"
        placeholder="Type 'mvn' or 'env' and press Enter"
        @keyup.enter="submitQuickSearch"
      />
      <template #footer>
        <el-button @click="closeSearch">Cancel</el-button>
        <el-button type="primary" @click="submitQuickSearch">Go</el-button>
      </template>
    </el-dialog>

    <!-- Keyboard Shortcuts drawer (slides in from right) -->
    <el-drawer v-model="shortcutsOpen" title="Keyboard Shortcuts" direction="rtl" size="420px">
      <div class="shortcut-list">
        <!-- Modern shortcut card: Quick Search -->
        <div class="shortcut-item">
          <div class="shortcut-left">
            <el-icon class="shortcut-icon"><Search /></el-icon>
            <div class="shortcut-text">
              <div class="shortcut-title">Quick Search</div>
              <div class="shortcut-sub">Open overlay and type aliases like mvn / env</div>
            </div>
          </div>
          <div class="shortcut-keys">
            <span class="kbd-key">Cmd</span><span class="plus">+</span><span class="kbd-key">P</span>
            <span class="slash">/</span>
            <span class="kbd-key">Ctrl</span><span class="plus">+</span><span class="kbd-key">P</span>
          </div>
        </div>
        <!-- Modern shortcut card: Settings -->
        <div class="shortcut-item">
          <div class="shortcut-left">
            <el-icon class="shortcut-icon"><Setting /></el-icon>
            <div class="shortcut-text">
              <div class="shortcut-title">Open Settings</div>
              <div class="shortcut-sub">Show settings overlay</div>
            </div>
          </div>
          <div class="shortcut-keys">
            <span class="kbd-key">Cmd</span><span class="plus">+</span><span class="kbd-key">,</span>
            <span class="slash">/</span>
            <span class="kbd-key">Ctrl</span><span class="plus">+</span><span class="kbd-key">,</span>
          </div>
        </div>
        <!-- Modern shortcut card: Close overlays -->
        <div class="shortcut-item">
          <div class="shortcut-left">
            <el-icon class="shortcut-icon"><Close /></el-icon>
            <div class="shortcut-text">
              <div class="shortcut-title">Close Overlay</div>
              <div class="shortcut-sub">Dismiss Search or Settings</div>
            </div>
          </div>
          <div class="shortcut-keys">
            <span class="kbd-key">Esc</span>
          </div>
        </div>
        <!-- Modern shortcut card: Submit Search -->
        <div class="shortcut-item">
          <div class="shortcut-left">
            <el-icon class="shortcut-icon"><List /></el-icon>
            <div class="shortcut-text">
              <div class="shortcut-title">Submit Search</div>
              <div class="shortcut-sub">Confirm and navigate</div>
            </div>
          </div>
          <div class="shortcut-keys">
            <span class="kbd-key">Enter</span>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- Notifications drawer (slides in from right) -->
    <el-drawer v-model="notificationsOpen" title="Notifications" direction="rtl" size="420px">
      <div class="notifications-toolbar">
        <div class="notifications-actions">
          <el-button size="small" @click="clearNotifications">Clear</el-button>
        </div>
      </div>
      <div v-if="notifications.length === 0">
        <el-empty description="No notifications" />
      </div>
      <div v-else class="notifications-list">
        <div v-for="n in notifications" :key="n.id" class="notification-item" :class="['lvl-' + (n.level || 'info')]">
          <div class="notif-row">
            <div class="notif-title">{{ n.title }}</div>
            <div class="notif-meta">{{ n.time }}</div>
          </div>
          <div class="notif-message">{{ n.message }}</div>
        </div>
      </div>
    </el-drawer>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { Collection, Fold, Expand, Setting, Search, Close, List, Monitor, Cpu, TrendCharts, ArrowLeft, Folder, Bell } from '@element-plus/icons-vue';
import AppHeader from './app/components/AppHeader.vue';
import MainHeader from './app/components/MainHeader.vue';
import {
  settingsOpen,
  openSettings,
  closeSettings,
  searchOpen,
  openSearch,
  closeSearch as globalCloseSearch,
  notificationsOpen,
  openNotifications,
  closeNotifications,
  shortcutsOpen,
  openShortcuts,
  closeShortcuts,
  registerSearchFocus,
} from './app/service/useGlobalUI';

type FileMeta = {
  name: string;
  relativePath: string;
  absolutePath: string;
  isDirectory: boolean;
  size?: number;
};

const activeTop = ref('home');
const activeMenu = ref('workspace');
const files = ref<FileMeta[]>([]);
const content = ref('');
const previewVisible = ref(false);
const addVisible = ref(false);
const addForm = ref<{ name: string; content: string }>({ name: '', content: '' });
const search = ref('');
const isAsideCollapsed = ref(false);
const asideWidth = computed(() => (isAsideCollapsed.value ? 64 : 220));

// Settings state and methods are provided by global UI composable

// Notifications: state and helpers (English-only comments)
type NotificationItem = { id: string; title: string; message: string; level?: 'info' | 'warning' | 'error' | 'success'; time: string };
const notifications = ref<NotificationItem[]>([]);
function clearNotifications() { notifications.value = []; }

// Helper to add notification into the right-side drawer (English-only comments)
function addNotification(title: string, message: string, level: 'info' | 'warning' | 'error' | 'success' = 'info') {
  const now = new Date();
  notifications.value.unshift({
    id: `${now.getTime()}-${Math.random().toString(36).slice(2)}`,
    title,
    message,
    level,
    time: now.toLocaleString(),
  });
}

onMounted(() => {
  // Subscribe to system notifications if preload exposes a channel
  const api: any = (window as any).notify;
  if (api && typeof api.on === 'function') {
    api.on((payload: any) => {
      addNotification(
        payload?.title || 'Message',
        payload?.message ? String(payload.message) : JSON.stringify(payload),
        (payload?.level || 'info')
      );
    });
  }
});
onUnmounted(() => {
  const api: any = (window as any).notify;
  if (api && typeof api.off === 'function') api.off();
});

// Shortcuts state and methods are provided by global UI composable

const hasM2 = computed(() => typeof window !== 'undefined' && (window as any).m2);

const filesOnly = computed(() => files.value.filter((f) => !f.isDirectory));
const filteredFiles = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return filesOnly.value;
  return filesOnly.value.filter((f) => f.name.toLowerCase().includes(term));
});

function onSelectMenu(index: string) {
  activeMenu.value = index;
}

function toggleAside() {
  isAsideCollapsed.value = !isAsideCollapsed.value;
}

function isXml(name: string) {
  return /\.xml$/i.test(name);
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function preview(f: FileMeta) {
  if (!isXml(f.name)) return;
  content.value = await window.m2.readFile(f.relativePath);
  previewVisible.value = true;
}

async function refresh() {
  try {
    if (!hasM2.value) {
      files.value = [];
      return;
    }
    files.value = await window.m2.listFiles();
  } catch (e) {
    ElMessage.error('Failed to refresh');
  }
}

function openAddDialog() {
  addForm.value = { name: '', content: '<?xml version="1.0" encoding="UTF-8"?>\n<configuration/>\n' };
  addVisible.value = true;
}

async function submitAdd() {
  const raw = addForm.value.name.trim();
  if (!raw) {
    ElMessage.warning('File name is required');
    return;
  }
  // Ensure .xml extension client-side convenience (server also enforces it)
  const name = /\.xml$/i.test(raw) ? raw : `${raw}.xml`;
  try {
    await window.m2.createFile(name, addForm.value.content);
    ElMessage.success('File created');
    addVisible.value = false;
    await refresh();
  } catch (e: any) {
    ElMessage.error(e?.message || 'Failed to create file');
  }
}

onMounted(async () => {
  await refresh();
  await refreshKnownWorkspaces();
  // Start status bar updates if system API is available
  if ((window as any).system) {
    await refreshStats();
    setInterval(refreshStats, 1000);
    // Preload environment versions for Environments page
    await refreshEnv();
  }
  // Global shortcut: Cmd+P / Ctrl+P to open quick search
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});

// System stats for status bar (English-only comments)
type SystemStats = {
  os: { platform: string; release: string; arch: string };
  cpu: { percent: number | null };
  memory: { usedBytes: number; totalBytes: number; percent: number };
};

const stats = ref<SystemStats | null>(null);

function platformName(p: string) {
  if (p === 'darwin') return 'macOS';
  if (p === 'win32') return 'Windows';
  if (p === 'linux') return 'Linux';
  return p;
}

async function refreshStats() {
  try {
    const s = await (window as any).system.getStats();
    stats.value = s;
  } catch {
    // Silently ignore status errors
  }
}

const osText = computed(() => {
  const s = stats.value;
  if (!s) return 'OS: …';
  return `OS: ${platformName(s.os.platform)} ${s.os.release} ${s.os.arch}`;
});

const cpuText = computed(() => {
  const p = stats.value?.cpu.percent;
  return p == null ? 'CPU: …' : `CPU: ${p.toFixed(0)}%`;
});

function toGB(bytes: number) {
  return bytes / (1024 * 1024 * 1024);
}

const memText = computed(() => {
  const s = stats.value;
  if (!s) return 'Mem: …';
  const used = toGB(s.memory.usedBytes);
  const total = toGB(s.memory.totalBytes);
  return `Mem: ${used.toFixed(1)} / ${total.toFixed(1)} GB (${s.memory.percent.toFixed(0)}%)`;
});

// Threshold-based UI helpers for CPU & Memory
const cpuPercent = computed(() => stats.value?.cpu.percent ?? null);
const memPercent = computed(() => stats.value?.memory.percent ?? null);

const cpuPercentDisplay = computed(() => {
  const p = cpuPercent.value;
  return p == null ? 0 : Math.max(0, Math.min(100, Math.round(p)));
});
const memPercentDisplay = computed(() => {
  const p = memPercent.value;
  return p == null ? 0 : Math.max(0, Math.min(100, Math.round(p)));
});

const cpuStatusClass = computed(() => (cpuPercentDisplay.value > 80 ? 'metric-warn' : 'metric-ok'));
const memStatusClass = computed(() => (memPercentDisplay.value > 80 ? 'metric-warn' : 'metric-ok'));

const memMeterWidth = computed(() => `${memPercentDisplay.value}%`);
const memColor = computed(() => (memPercentDisplay.value > 80 ? '#f59e0b' : '#10b981'));

const memUsedGB = computed(() => {
  const s = stats.value;
  return s ? toGB(s.memory.usedBytes).toFixed(1) : '…';
});
const memTotalGB = computed(() => {
  const s = stats.value;
  return s ? toGB(s.memory.totalBytes).toFixed(1) : '…';
});

// Environment versions (English-only comments)
type EnvVersions = { java: string | null; python: string | null; mvn: string | null };
const envVersions = ref<EnvVersions | null>(null);

async function refreshEnv() {
  try {
    const v = await (window as any).system.getEnvVersions();
    envVersions.value = v;
  } catch {
    // Ignore errors silently
  }
}

const envJavaText = computed(() => {
  const v = envVersions.value?.java;
  return v ? `Java ${v}` : 'Java: Not found';
});
const envPythonText = computed(() => {
  const v = envVersions.value?.python;
  return v ? `Python ${v}` : 'Python: Not found';
});
const envMavenText = computed(() => {
  const v = envVersions.value?.mvn;
  return v ? `Maven ${v}` : 'Maven: Not found';
});

// Workspace state (English-only comments)
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
    // Use notification popup to guide user to choose directory
    ElNotification({ title: 'Workspace', message: 'Please choose a directory', type: 'info', duration: 2500 });
    return;
  }
  scanning.value = true;
  try {
    repos.value = await (window as any).workspace?.scanGitRepos?.(workspaceRoot.value);
    // Persist to workspace cache and refresh list
    try {
      await (window as any).workspaceCache?.set?.(workspaceRoot.value, repos.value);
      addNotification('Cache Updated', `Saved ${repos.value.length} repositories for: ${workspaceRoot.value}`, 'success');
    } catch (e: any) {
      addNotification('Cache Error', e?.message || 'Failed to update workspace cache', 'warning');
    }
    await refreshKnownWorkspaces();
    // Notify completion with repo count
    const count = Array.isArray(repos.value) ? repos.value.length : 0;
    if (count > 0) {
      ElNotification({ title: 'Scan Completed', message: `Found ${count} Git repositories`, type: 'success', duration: 3500 });
      addNotification('Scan Completed', `Found ${count} Git repositories`, 'success');
    } else {
      ElNotification({ title: 'Scan Completed', message: 'No repositories found', type: 'warning', duration: 3500 });
      addNotification('Scan Completed', 'No repositories found', 'warning');
    }
  } catch (e: any) {
    // Show error as notification popup
    ElNotification({ title: 'Scan Failed', message: e?.message || 'Failed to scan workspace', type: 'error', duration: 4500 });
    addNotification('Scan Failed', e?.message || 'Failed to scan workspace', 'error');
  } finally {
    scanning.value = false;
  }
}

// Load cached workspaces list on startup (English-only comments)
async function refreshKnownWorkspaces() {
  try {
    const list = await (window as any).workspaceCache?.list?.();
    knownWorkspaces.value = Array.isArray(list) ? list : [];
  } catch {
    knownWorkspaces.value = [];
  }
}

// Handle selecting a cached workspace from dropdown
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
      // Auto-scan when cache miss to ensure automatic caching
      await scanWorkspace();
    }
  } catch {
    // On error, attempt to auto-scan to populate cache
    await scanWorkspace();
  }
}

// Navigate to collapse view and expand specific repository panel (English-only comment)
function openRepoDetails(repoPath: string) {
  workspaceViewMode.value = 'details';
  activeRepoPanels.value = [repoPath];
}

// Track selection changes in Operations table for future bulk actions
function onRepoSelectionChange(selection: RepoInfo[]) {
  selectedRepoPaths.value = selection.map(r => r.path);
}

// Quick search logic (English-only comments)
const searchTerm = ref('');
const quickInputRef = ref<HTMLInputElement | null>(null);

function closeSearch() {
  globalCloseSearch();
  searchTerm.value = '';
}
function submitQuickSearch() {
  const t = searchTerm.value.trim().toLowerCase();
  if (t === 'ws' || t === 'workspace') {
    activeMenu.value = 'workspace';
    closeSearch();
    return;
  }
  if (t === 'mvn' || t === 'maven') {
    activeMenu.value = 'maven';
    closeSearch();
    return;
  }
  if (t === 'env' || t === 'environments') {
    activeMenu.value = 'env';
    closeSearch();
    return;
  }
  ElMessage.info("Unknown target. Type 'ws', 'mvn', or 'env'.");
}
function handleGlobalKeydown(e: KeyboardEvent) {
  const isCmdOrCtrlP = (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'p';
  const isCmdOrCtrlComma = (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key === ',';
  // Open Settings overlay with Cmd/Ctrl + , (comma)
  if (isCmdOrCtrlComma) {
    e.preventDefault();
    if (!settingsOpen.value) openSettings();
    return;
  }
  // Open Quick Search with Cmd/Ctrl + P only when settings is not open
  if (isCmdOrCtrlP && !settingsOpen.value) {
    e.preventDefault();
    openSearch();
    return;
  }
  // Close overlays with Escape
  if (e.key === 'Escape') {
    if (searchOpen.value) {
      e.preventDefault();
      closeSearch();
      return;
    }
    if (settingsOpen.value) {
      e.preventDefault();
      closeSettings();
      return;
    }
  }
}

// Register focus hook for Quick Search input after dialog opens
onMounted(() => {
  registerSearchFocus(() => {
    nextTick(() => {
      (quickInputRef.value as any)?.focus?.();
    });
  });
});
</script>

<style>
:root {
  /* App theme: unify header, sidebar active, and Element Plus primary */
  --el-color-primary: #6366f1;          /* indigo-500 */
  --el-color-primary-dark-2: #4f46e5;   /* indigo-600 */
  --el-color-primary-light-3: #a5b4fc;  /* indigo-300 */
  --el-color-primary-light-5: #c7d2fe;  /* indigo-200 */
  --el-color-primary-light-7: #e0e7ff;  /* indigo-100 */
  --el-color-primary-light-8: #eef2ff;  /* indigo-50 */
  --el-color-primary-light-9: #f5f7ff;  /* near-white for subtle hovers */
}
.titlebar {
  /* Make the entire header draggable like a native title bar */
  -webkit-app-region: drag;
  border-bottom: none;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-sizing: border-box;
  background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
  color: #fff;
}
.titlebar-inner {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: 100%;
  /* Leave space for macOS traffic lights when titleBarStyle is hiddenInset */
  padding-left: 72px;
  padding-right: 12px;
}
.titlebar-search {
  width: 80%;
  max-width: 1000px;
  min-width: 520px;
}
.titlebar-actions {
  justify-self: end;
}
.titlebar-actions .icon-btn { padding: 0 6px; }
.settings-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.settings-text {
  font-size: 13px;
  color: #fff;
}
.search-input .el-input__wrapper {
  height: 34px;
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.18);
  border-color: transparent;
  box-shadow: none;
}
.search-input .el-input__inner { color: #fff; }
.search-input .el-input__inner::placeholder { color: rgba(255, 255, 255, 0.85); }
.kbd-hint {
  display: inline-block;
  padding: 0 6px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-bottom-width: 2px;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.12);
  font-size: 12px;
  line-height: 18px;
}
.no-drag {
  /* Allow interactive elements to be clickable within a draggable titlebar */
  -webkit-app-region: no-drag;
}
.brand {
  font-weight: 600;
  color: #fff;
}
.aside {
  border-right: 0; /* use el-aside to render the single separator line */
  height: 100%;
  overflow: hidden;
  transition: width 0.2s ease;
  background: linear-gradient(180deg, #f9fafb, #f3f4f6);
}
.aside-title {
  font-weight: 600;
  padding: 10px 12px 6px 12px;
  color: #333;
}
/* Restore thin grey separator line via el-aside to avoid disappearance */
.el-aside {
  border-right: 1px solid #e6e6e6;
}
.aside .el-menu,
.aside .el-menu-item {
  border-right: 0;
}
.aside .el-menu { background: transparent; padding: 8px 4px; }
.aside .el-menu-item { height: 34px; line-height: 34px; padding: 0 12px; font-size: 13px; margin: 4px 8px; border-radius: 8px; position: relative; transition: background 0.15s ease, color 0.15s ease; }
.aside .el-menu-item:hover { background: rgba(0, 0, 0, 0.04); }
.aside .el-menu-item.is-active { background: var(--el-color-primary-light-8); color: #1f2937; }
.aside .el-menu-item.is-active::before { content: ''; position: absolute; left: 0; top: 6px; bottom: 6px; width: 3px; border-radius: 2px; background: var(--el-color-primary); }
.aside .el-menu-item.is-active .el-icon { color: var(--el-color-primary-dark-2); }
.aside .el-menu-item:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
.aside.collapsed .el-menu { padding: 8px 0; }
.aside.collapsed .el-menu-item { padding: 0 10px; margin: 6px; justify-content: center; }
.aside.collapsed .el-menu-item.is-active::before { left: 0; top: 4px; bottom: 4px; width: 2px; }
.aside .el-menu { padding: 6px 0; }
.aside .el-menu-item { height: 34px; line-height: 34px; padding: 0 12px; font-size: 13px; }
.aside .el-menu-item span {
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 0.2s ease, max-width 0.2s ease, margin 0.2s ease;
}
.aside.collapsed .el-menu-item span {
  opacity: 0;
  max-width: 0;
  margin: 0;
}
.aside .el-menu-item .el-icon {
  margin-right: 8px;
  font-size: 16px;
  transition: margin 0.2s ease;
}
.aside.collapsed .el-menu-item .el-icon {
  margin-right: 0;
}
.aside-toggle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 500;
  opacity: 0;
  pointer-events: none;
  transition: left 0.2s ease, opacity 0.15s ease-in-out;
}
/* Icons and action buttons should be readable on gradient */
.titlebar .el-icon { color: #fff; }
.titlebar-actions .el-button { color: #fff; }
.section-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}
.subnav {
  padding: 0 12px;
  margin-bottom: 8px;
}

.code {
  white-space: pre-wrap;
  word-break: break-word;
  background: #f7f7f7;
  border: 1px solid #eee;
  padding: 12px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px 0;
}
.toolbar-search {
  width: 280px;
}
.toolbar-actions {
  display: flex;
  gap: 8px;
}
.app-root {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.content-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Show toggle only when hovering sidebar or the toggle itself */
.aside:hover + .aside-toggle,
.aside-toggle:hover {
  opacity: 1;
  pointer-events: auto;
}
.main-scroll {
  height: 100%;
  overflow: auto;
  border-left: 0; /* ensure no extra border on main content */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
.main-scroll::-webkit-scrollbar { /* Chrome/Safari */
  width: 0;
  height: 0;
  display: none;
}
.env-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.env-item {
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 10px 12px;
  background: #fafafa;
}
.env-label {
  font-weight: 600;
  margin-bottom: 6px;
}
.env-value {
  color: #333;
}
.statusbar {
  border-top: 1px solid #eee;
  background: #f5f5f5; /* light gray background for footer status bar */
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 8px;
}
.status-left { display: flex; align-items: center; gap: 8px; }
.status-right { margin-left: auto; display: flex; align-items: center; }
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border: 1px solid #eaeaea;
  border-radius: 12px;
  background: #fff;
  color: #333;
}
.chip-text { line-height: 24px; }
.status-sep { color: #999; }
.statusbar :deep(.el-icon) { color: #666; }
.statusbar :deep(.el-button) { color: #666; }

/* Mini meter inside memory chip */
.mini-meter {
  width: 80px;
  height: 6px;
  border-radius: 3px;
  background: #f1f5f9;
  overflow: hidden;
  display: inline-block;
}
.mini-meter-fill {
  display: block;
  height: 100%;
  width: 0%;
  transition: width 0.25s ease;
}

/* Threshold coloring for chip text */
.metric-warn .chip-text { color: #d97706; }
.metric-ok .chip-text { color: #333; }

/* Popover content */
.popover-content { display: grid; gap: 6px; }
.popover-title { font-weight: 600; font-size: 13px; }
.popover-meta { font-size: 12px; color: #666; }
.shortcut-text {
  font-size: 12px;
}
.shortcut-btn .shortcut-text {
  max-width: 0;
  opacity: 0;
  margin-left: 0;
  transition: max-width 0.2s ease, opacity 0.2s ease, margin 0.2s ease;
  overflow: hidden;
  white-space: nowrap;
}
.shortcut-btn:hover .shortcut-text {
  max-width: 120px;
  opacity: 1;
  margin-left: 6px;
}
.shortcut-list {
  display: grid;
  gap: 12px;
  padding: 6px;
}
.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid #eaeaea;
  border-radius: 10px;
  background: #fff;
}
.shortcut-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.shortcut-icon {
  color: #666;
}
.shortcut-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.shortcut-title {
  font-weight: 600;
}
.shortcut-sub {
  color: #777;
  font-size: 12px;
}
.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 6px;
}
.kbd-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f7f7f8;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.06);
  font-size: 12px;
  color: #333;
}
.plus, .slash {
  color: #999;
  padding: 0 4px;
}
/* Hide drawer body scrollbar for cleaner look while preserving scroll */
.el-drawer__body {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.el-drawer__body::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

/* Settings overlay styles */
.settings-overlay {
  position: absolute;
  inset: 0;
  background: #fff;
  z-index: 1500;
  display: flex;
  flex-direction: column;
}
.settings-header {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
  padding: 0 12px;
}
.settings-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

/* Notifications drawer styles */
.notifications-toolbar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
.notifications-actions { display: inline-flex; align-items: center; gap: 8px; }
.notifications-list { display: flex; flex-direction: column; gap: 8px; }
.notification-item { border: 1px solid #eee; border-radius: 6px; padding: 8px 10px; }
.notification-item .notif-row { display: flex; justify-content: space-between; align-items: baseline; }
.notif-title { font-weight: 600; color: #333; }
.notif-meta { font-size: 12px; color: #888; }
.notif-message { margin-top: 6px; color: #444; line-height: 1.4; }
.notification-item.lvl-warning { border-color: #f59e0b; background: #fff7ed; }
.notification-item.lvl-error { border-color: #ef4444; background: #fef2f2; }
.notification-item.lvl-info { border-color: #93c5fd; background: #eff6ff; }
.notification-item.lvl-success { border-color: #10b981; background: #ecfdf5; }
/* Global hidden scrollbars for common containers */
.app-root,
.content-container,
.el-dialog__body,
.el-table__body-wrapper {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.app-root::-webkit-scrollbar,
.content-container::-webkit-scrollbar,
.el-dialog__body::-webkit-scrollbar,
.el-table__body-wrapper::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.header-actions { margin-left: auto; }

/* Workspace repo collapse styles */
.repo-summary {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.repo-title {
  font-weight: 600;
  color: #333;
  font-size: 16px;
}
.repo-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #666;
  font-size: 12px;
}
.repo-branch { color: #444; }
.repo-path { color: #777; }
.repo-detail {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 6px 10px;
  padding: 6px 6px;
}
.repo-detail-row { display: contents; }
.repo-detail .label { color: #666; }
.repo-detail .value { color: #333; }

/* Repo status flags */
.repo-flags { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
.repo-summary .repo-flags { margin-top: 6px; }
.repo-flag {
  display: inline-flex;
  align-items: center;
  padding: 1px 5px;
  height: 18px;
  line-height: 16px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  font-size: 11px;
}
.flag-unstaged { color: #b45309; background: #fff7ed; border-color: #fed7aa; }
.flag-ahead { color: #065f46; background: #ecfdf5; border-color: #a7f3d0; }
.flag-behind { color: #7f1d1d; background: #fef2f2; border-color: #fecaca; }
.flag-clean { color: #374151; background: #f9fafb; border-color: #e5e7eb; }

/* Add spacing between collapse items so status and next panel don't touch */
.el-collapse-item { margin-bottom: 12px; }
/* Add spacing between adjacent collapse items when collapsed */
.el-collapse-item + .el-collapse-item { margin-top: 12px; }
/* Compact header/content padding */
.el-collapse-item__header { padding: 6px 10px; }
.el-collapse-item__content { padding: 6px 10px; }
/* Extra spacing below header when collapsed */
.el-collapse-item:not(.is-active) > .el-collapse-item__header { margin-bottom: 10px; }

/* Modern style for Operations table (English-only comments) */
.modern-table {
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}
/* Ensure Element Plus table root has no background/border */
.modern-table :deep(.el-table) {
  background: transparent;
  border: none;
}
/* Header wrapper transparent for open style */
.modern-table :deep(.el-table__header-wrapper) {
  background: transparent;
}
/* Remove vertical separators and extra patches */
.modern-table :deep(.el-table__inner-wrapper)::before,
.modern-table :deep(.el-table__border-right-patch),
.modern-table :deep(.el-table--border::before),
.modern-table :deep(.el-table--border::after) {
  display: none;
}
/* Header cells: only bottom line */
.modern-table :deep(th.el-table__cell) {
  font-weight: 600;
  color: #374151;
  background: transparent;
  padding: 10px 12px;
  border-right: 0 !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
/* Body cells: only bottom line, no vertical lines */
.modern-table :deep(.el-table__cell) {
  padding: 10px 12px;
  border-right: 0 !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
/* Stripe rows with very light tone */
.modern-table :deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: rgba(0, 0, 0, 0.02);
}
/* Hover and current row remain subtle */
.modern-table :deep(.el-table__row:hover > td) {
  background-color: var(--el-color-primary-light-9);
}
.modern-table :deep(.el-table__body tr.current-row > td) {
  background-color: var(--el-color-primary-light-8);
}
/* Selection checkbox reflects theme */
.modern-table :deep(.el-checkbox.is-checked .el-checkbox__inner) {
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary);
}
.modern-table :deep(.el-checkbox__inner:hover) {
  border-color: var(--el-color-primary);
}
</style>