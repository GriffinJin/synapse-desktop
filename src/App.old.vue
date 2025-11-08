<template>
  <div class="container">
    <div class="sidebar">
      <h2>~/.m2/config Files</h2>
      <p class="hint">Select an XML file to preview.</p>
      <ul class="file-list">
        <li v-for="f in files" :key="f.relativePath">
          <button
            class="file-item"
            :disabled="f.isDirectory || !isXml(f.name)"
            @click="preview(f)"
            title="Click to preview XML"
          >
            <span class="name">{{ f.relativePath }}</span>
            <span class="meta" v-if="!f.isDirectory && f.size">({{ formatSize(f.size) }})</span>
            <span class="meta" v-else>(dir)</span>
          </button>
        </li>
      </ul>
    </div>

    <div class="preview">
      <h2>Preview</h2>
      <pre v-if="content" class="code">{{ content }}</pre>
      <p v-else class="placeholder">No file selected. Pick an XML file.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

type FileMeta = {
  name: string;
  relativePath: string;
  absolutePath: string;
  isDirectory: boolean;
  size?: number;
};

const files = ref<FileMeta[]>([]);
const content = ref('');

function isXml(name: string) {
  return /\.xml$/i.test(name);
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function preview(f: FileMeta) {
  if (f.isDirectory || !isXml(f.name)) return;
  content.value = await window.m2.readFile(f.relativePath);
}

onMounted(async () => {
  files.value = await window.m2.listFiles();
});
</script>

<style>
.container {
  display: flex;
  height: 100vh;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
}
.sidebar {
  width: 40%;
  border-right: 1px solid #e5e5e5;
  padding: 16px;
  overflow: auto;
}
.preview {
  flex: 1;
  padding: 16px;
  overflow: auto;
}
.file-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
}
.file-item {
  display: flex;
  justify-content: space-between;
  width: 100%;
  text-align: left;
  padding: 6px 8px;
  margin: 4px 0;
  border: 1px solid #ddd;
  background: #fafafa;
  cursor: pointer;
}
.file-item:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.code {
  white-space: pre-wrap;
  word-break: break-word;
  background: #f7f7f7;
  border: 1px solid #eee;
  padding: 12px;
}
.placeholder, .hint {
  color: #777;
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta {
  color: #888;
}
</style>
