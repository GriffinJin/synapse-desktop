<template>
  <div class="header-content">
    <div class="header-title">Synapse Desktop</div>
    <div class="header-actions">
      <vscode-button appearance="icon" @click="handleOpenSearch" title="Search">
        <span class="codicon codicon-search"></span>
      </vscode-button>
      <vscode-button appearance="icon" @click="handleOpenNotifications" title="Notifications">
        <span class="codicon codicon-bell"></span>
      </vscode-button>
      <vscode-button appearance="icon" @click="handleOpenSettings" title="Settings">
        <span class="codicon codicon-settings-gear"></span>
      </vscode-button>
    </div>
  </div>
</template>

<script setup lang="ts">
function handleOpenSearch() {
  alert('Search - Coming soon');
}

function handleOpenNotifications() {
  alert('Notifications - Coming soon');
}

function handleOpenSettings() {
  alert('Settings - Coming soon');
}
</script>

<style scoped>
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 100%;
  padding-left: 68px; /* Add space for macOS traffic lights */
}

.header-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--vscode-text);
}

.header-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

/* Codicon font for icons */
.codicon {
  font-family: codicon;
  font-size: 16px;
}

.codicon-search::before { content: '\eB65'; }
.codicon-bell::before { content: '\eB27'; }
.codicon-settings-gear::before { content: '\eB52'; }

/* Remove padding on non-macOS platforms */
@media (not (platform: macOS)) {
  .header-content {
    padding-left: 0;
  }
}
</style>