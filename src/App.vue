<template>
  <el-container class="app-root">
    <!-- Titlebar: draggable area to align with macOS traffic lights -->
    <el-header height="40px" class="titlebar">
      <div class="titlebar-inner">
        <div class="brand no-drag">Synapse Desktop</div>
        <el-menu class="no-drag" mode="horizontal" :default-active="activeTop">
          <el-menu-item index="home">Home</el-menu-item>
        </el-menu>
      </div>
    </el-header>

    <el-container class="content-container">
      <!-- Sidebar: single-level menu -->
      <el-aside width="220px" class="aside">
        <el-menu :default-active="activeMenu" @select="onSelectMenu">
          <el-menu-item index="maven">Maven</el-menu-item>
        </el-menu>
      </el-aside>

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
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

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
});
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  /* Leave space for macOS traffic lights when titleBarStyle is hiddenInset */
  padding-left: 72px;
  padding-right: 12px;
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
}
.main-scroll {
  height: 100%;
  overflow: auto;
}
</style>