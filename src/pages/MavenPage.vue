<template>
  <div>
    <MainHeader title="Maven Configuration" subtitle="Configure and Preview Maven" />
    <div class="toolbar">
      <el-input v-model="search" placeholder="Search by file name" clearable class="toolbar-search" />
      <div class="toolbar-actions">
        <el-button @click="refresh" :disabled="!hasM2">Refresh</el-button>
        <el-button type="primary" @click="openAddDialog" :disabled="!hasM2">Add</el-button>
      </div>
    </div>
    <el-table :data="filteredFiles" border>
      <el-table-column prop="name" label="Name" min-width="220" />
      <el-table-column prop="relativePath" label="Relative Path" min-width="280" />
      <el-table-column label="Status" width="140">
        <template #default="{ row }">
          <el-tag :type="isActiveConfig(row) ? 'success' : activeConfigPath ? 'info' : 'warning'">
            {{ isActiveConfig(row) ? 'Enabled' : activeConfigPath ? 'Disabled' : 'Unknown' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="size" label="Size" width="120">
        <template #default="{ row }">
          <span v-if="typeof row.size === 'number'">{{ formatSize(row.size) }}</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="160">
        <template #default="{ row }">
          <el-tooltip content="Preview" placement="top">
            <span>
              <el-button size="small" type="primary" plain circle :icon="View" :disabled="!isXml(row.name)" @click="preview(row)" />
            </span>
          </el-tooltip>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import MainHeader from '../components/MainHeader.vue';
import { ElMessage } from 'element-plus';
import { View } from '@element-plus/icons-vue';

type FileMeta = {
  name: string;
  relativePath: string;
  absolutePath: string;
  isDirectory: boolean;
  size?: number;
};

const files = ref<FileMeta[]>([]);
const content = ref('');
const previewVisible = ref(false);
const addVisible = ref(false);
const addForm = ref<{ name: string; content: string }>({ name: '', content: '' });
const search = ref('');
const hasM2 = computed(() => typeof window !== 'undefined' && (window as any).m2);
const activeConfigPath = ref<string | null>(null);

async function refreshActiveConfig() {
  try {
    if (!hasM2.value) {
      activeConfigPath.value = null;
      return;
    }
    const t = await (window as any).m2.getActiveConfig();
    activeConfigPath.value = typeof t === 'string' && t.length ? t : null;
  } catch {
    activeConfigPath.value = null;
  }
}

const filesOnly = computed(() => files.value.filter((f) => !f.isDirectory));
const filteredFiles = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return filesOnly.value;
  return filesOnly.value.filter((f) => f.name.toLowerCase().includes(term));
});

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
function isActiveConfig(f: FileMeta) {
  const t = activeConfigPath.value;
  if (!t) return false;
  if (/\.xml$/i.test(t)) return f.absolutePath === t;
  const normalized = t.endsWith('/') ? t.slice(0, -1) : t;
  const candidate = `${normalized}/settings.xml`;
  return f.absolutePath === candidate;
}
async function refresh() {
  try {
    if (!hasM2.value) {
      files.value = [];
      return;
    }
    files.value = await window.m2.listFiles();
    await refreshActiveConfig();
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
  const name = /\.xml$/i.test(raw) ? raw : `${raw}.xml`;
  try {
    await window.m2.createFile(name, addForm.value.content);
    addVisible.value = false;
    await refresh();
  } catch (e: any) {
    ElMessage.error(e?.message || 'Failed to create file');
  }
}
</script>