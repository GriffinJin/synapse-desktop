<template>
  <div>
    <PageHeader title="Maven Configuration" subtitle="Configure and Preview Maven" />
    <div class="toolbar">
      <vscode-text-field v-model="search" placeholder="Search by file name" class="toolbar-search" />
      <div class="toolbar-actions">
        <vscode-button @click="refresh" :disabled="!hasM2">Refresh</vscode-button>
        <vscode-button appearance="primary" @click="openAddDialog" :disabled="!hasM2">Add</vscode-button>
      </div>
    </div>
    
    <div v-if="filteredFiles.length > 0" class="data-grid-container">
      <table class="vscode-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Relative Path</th>
            <th style="width: 140px;">Status</th>
            <th style="width: 120px;">Size</th>
            <th style="width: 160px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredFiles" :key="row.absolutePath">
            <td>{{ row.name }}</td>
            <td>{{ row.relativePath }}</td>
            <td>
              <vscode-tag v-if="isActiveConfig(row)" class="status-tag success">Enabled</vscode-tag>
              <vscode-tag v-else-if="activeConfigPath" class="status-tag info">Disabled</vscode-tag>
              <vscode-tag v-else class="status-tag warning">Unknown</vscode-tag>
            </td>
            <td>
              <span v-if="typeof row.size === 'number'">{{ formatSize(row.size) }}</span>
              <span v-else>-</span>
            </td>
            <td>
              <vscode-button 
                appearance="icon" 
                :disabled="!isXml(row.name)" 
                @click="preview(row)"
                title="Preview"
              >
                <span class="codicon codicon-eye"></span>
              </vscode-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-state">
      <div class="empty-state-icon">📄</div>
      <div class="empty-state-text">No files found</div>
    </div>
    
    <!-- Preview Modal -->
    <div v-if="previewVisible" class="modal-overlay" @click="previewVisible = false">
      <div class="modal-container" @click.stop style="width: 60%; max-width: 800px;">
        <div class="modal-header">Preview XML</div>
        <div class="modal-body">
          <pre class="code-preview">{{ content }}</pre>
        </div>
        <div class="modal-footer">
          <vscode-button @click="previewVisible = false">Close</vscode-button>
        </div>
      </div>
    </div>
    
    <!-- Add File Modal -->
    <div v-if="addVisible" class="modal-overlay" @click="addVisible = false">
      <div class="modal-container" @click.stop style="width: 600px;">
        <div class="modal-header">Add XML File</div>
        <div class="modal-body">
          <div class="form-group">
            <label>File Name</label>
            <vscode-text-field v-model="addForm.name" placeholder="example.xml" />
          </div>
          <div class="form-group">
            <label>Content</label>
            <vscode-text-area v-model="addForm.content" :rows="10" resize="vertical" />
          </div>
        </div>
        <div class="modal-footer">
          <vscode-button @click="addVisible = false">Cancel</vscode-button>
          <vscode-button appearance="primary" @click="submitAdd" :disabled="!hasM2">Create</vscode-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import PageHeader from '../components/PageHeader.vue';

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
    alert('Failed to refresh');
  }
}
function openAddDialog() {
  addForm.value = { name: '', content: '<?xml version="1.0" encoding="UTF-8"?>\n<configuration/>\n' };
  addVisible.value = true;
}
async function submitAdd() {
  const raw = addForm.value.name.trim();
  if (!raw) {
    alert('File name is required');
    return;
  }
  const name = /\.xml$/i.test(raw) ? raw : `${raw}.xml`;
  try {
    await window.m2.createFile(name, addForm.value.content);
    addVisible.value = false;
    await refresh();
  } catch (e: any) {
    alert(e?.message || 'Failed to create file');
  }
}
</script>

<style scoped>
.code-preview {
  background-color: var(--vscode-bg);
  color: var(--vscode-text);
  padding: 16px;
  border-radius: 2px;
  overflow-x: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--vscode-text);
  font-size: 13px;
}

.codicon-eye::before { content: '\eb4a'; }
</style>