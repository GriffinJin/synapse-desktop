<template>
  <el-container class="app-root">
    <!-- Titlebar: draggable area to align with macOS traffic lights -->
    <el-header height="40px" class="titlebar">
      <div class="titlebar-inner">
        <div class="brand no-drag">Synapse Desktop</div>
        <div class="titlebar-search no-drag" @click="openSearch">
          <el-input readonly placeholder="Quick Search" class="search-input">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <template #suffix>
              <span class="kbd-hint">Cmd + P</span>
            </template>
          </el-input>
        </div>
        <div class="titlebar-spacer"></div>
      </div>
    </el-header>

    <el-container class="content-container">
      <!-- Sidebar: single-level menu with icons -->
      <el-aside :width="isAsideCollapsed ? '64px' : '220px'" :class="['aside', { collapsed: isAsideCollapsed }]">
        <el-menu :default-active="activeMenu" @select="onSelectMenu">
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
        <template v-if="activeMenu === 'maven'">
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
    </el-container>
    <el-footer height="22px" class="statusbar">
      <div class="status-item">{{ osText }}</div>
      <div class="status-item">{{ cpuText }}</div>
      <div class="status-item">{{ memText }}</div>
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
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Collection, Fold, Expand, Setting, Search } from '@element-plus/icons-vue';

type FileMeta = {
  name: string;
  relativePath: string;
  absolutePath: string;
  isDirectory: boolean;
  size?: number;
};

const activeTop = ref('home');
const activeMenu = ref('maven');
const files = ref<FileMeta[]>([]);
const content = ref('');
const previewVisible = ref(false);
const addVisible = ref(false);
const addForm = ref<{ name: string; content: string }>({ name: '', content: '' });
const search = ref('');
const isAsideCollapsed = ref(false);
const asideWidth = computed(() => (isAsideCollapsed.value ? 64 : 220));

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

// Quick search logic (English-only comments)
const searchOpen = ref(false);
const searchTerm = ref('');
const quickInputRef = ref<HTMLInputElement | null>(null);

function openSearch() {
  searchOpen.value = true;
  nextTick(() => {
    // Focus input after dialog opens
    (quickInputRef.value as any)?.focus?.();
  });
}
function closeSearch() {
  searchOpen.value = false;
  searchTerm.value = '';
}
function submitQuickSearch() {
  const t = searchTerm.value.trim().toLowerCase();
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
  ElMessage.info("Unknown target. Type 'mvn' or 'env'.");
}
function handleGlobalKeydown(e: KeyboardEvent) {
  const isCmdOrCtrlP = (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'p';
  if (isCmdOrCtrlP) {
    e.preventDefault();
    openSearch();
  } else if (e.key === 'Escape' && searchOpen.value) {
    e.preventDefault();
    closeSearch();
  }
}
</script>

<style>
.titlebar {
  /* Make the entire header draggable like a native title bar */
  -webkit-app-region: drag;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-sizing: border-box;
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
.search-input .el-input__wrapper {
  height: 28px;
  border-radius: 14px;
}
.kbd-hint {
  display: inline-block;
  padding: 0 6px;
  border: 1px solid #ddd;
  border-bottom-width: 2px;
  border-radius: 4px;
  color: #666;
  font-size: 12px;
  line-height: 18px;
}
.no-drag {
  /* Allow interactive elements to be clickable within a draggable titlebar */
  -webkit-app-region: no-drag;
}
.brand {
  font-weight: 600;
}
.aside {
  border-right: 1px solid #eee;
  height: 100%;
  overflow: hidden;
  transition: width 0.2s ease;
}
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
.section-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}
.muted {
  color: #888;
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
  background: #fafafa;
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 8px;
}
.status-item {
  line-height: 22px;
}
</style>