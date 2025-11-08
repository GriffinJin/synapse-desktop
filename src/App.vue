<template>
  <el-container style="height: 100vh">
    <!-- Header navigation -->
    <el-header height="56px">
      <div class="header-bar">
        <div class="brand">Synapse Desktop</div>
        <el-menu mode="horizontal" :default-active="activeTop">
          <el-menu-item index="home">Home</el-menu-item>
        </el-menu>
      </div>
    </el-header>

    <el-container>
      <!-- Sidebar: single-level menu -->
      <el-aside width="220px" class="aside">
        <el-menu :default-active="activeMenu" @select="onSelectMenu">
          <el-menu-item index="maven">Maven</el-menu-item>
        </el-menu>
      </el-aside>

      <!-- Main content -->
      <el-main>
        <template v-if="activeMenu === 'maven'">
          <div class="section-header">
            <h2>Maven Config Files (~/.m2/config)</h2>
            <span class="muted">Preview is enabled for .xml files</span>
          </div>

          <el-table :data="filesOnly" border height="calc(100vh - 56px - 120px)">
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

          <el-empty v-if="filesOnly.length === 0" description="No files found" />

          <el-dialog v-model="previewVisible" title="Preview XML" width="60%">
            <pre class="code">{{ content }}</pre>
            <template #footer>
              <el-button @click="previewVisible = false">Close</el-button>
            </template>
          </el-dialog>
        </template>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

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

const filesOnly = computed(() => files.value.filter((f) => !f.isDirectory));

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

onMounted(async () => {
  // Guard for non-Electron browser preview where preload API is unavailable
  if (typeof window !== 'undefined' && (window as any).m2 && typeof (window as any).m2.listFiles === 'function') {
    files.value = await window.m2.listFiles();
  } else {
    files.value = [];
  }
});
</script>

<style>
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.brand {
  font-weight: 600;
}
.aside {
  border-right: 1px solid #eee;
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
</style>