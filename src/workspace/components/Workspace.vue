<template v-if="activeMenu === 'workspace'">
    <div class="section-header">
        <h2>Workspace</h2>
        <span class="muted">Select a directory to discover Git repositories</span>
    </div>

    <div class="subnav">
        <el-tabs v-model="workspaceViewMode">
            <el-tab-pane label="Operations" name="operations" />
            <el-tab-pane label="Details" name="details" />
        </el-tabs>
    </div>

    <div class="workspace-body" v-loading="scanning" element-loading-text="Scanning repositories..."
        element-loading-background="rgba(255,255,255,0.6)">

        <div class="toolbar">
            <div class="toolbar-left">
                <!-- Workspace selector: choose from cached workspaces -->
                <el-select v-model="workspaceRoot" placeholder="Select a workspace" class="toolbar-search" filterable
                    clearable @change="onWorkspaceSelected">
                    <el-option v-for="w in knownWorkspaces" :key="w.root" :label="w.root" :value="w.root" />
                </el-select>
            </div>
            <div class="toolbar-actions">
                <el-button @click="chooseWorkspaceRoot" :disabled="scanning">Choose Directory</el-button>
                <el-button type="primary" @click="scanWorkspace" :disabled="!workspaceRoot || scanning"
                    :loading="scanning">Scan</el-button>
            </div>
        </div>

        <template v-if="repos.length">
            <el-collapse v-if="workspaceViewMode === 'details'" v-model="activeRepoPanels">
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
                                <span v-if="!repo.unstaged && !repo.ahead && !repo.behind"
                                    class="repo-flag flag-clean">Clean</span>
                            </div>
                        </div>
                    </template>
                    <div class="repo-detail">
                        <div class="repo-detail-row"><span class="label">Repository</span><span class="value">{{
                                repo.name }}</span></div>
                        <div class="repo-detail-row"><span class="label">Path</span><span class="value">{{
                                repo.path }}</span></div>
                        <div class="repo-detail-row"><span class="label">Branch</span><span class="value">{{
                                repo.branch || 'unknown'
                                }}</span></div>
                        <div class="repo-detail-row"><span class="label">Status</span><span class="value">
                                <span v-if="repo.unstaged" class="repo-flag flag-unstaged">Unstaged</span>
                                <span v-if="repo.ahead" class="repo-flag flag-ahead">Ahead</span>
                                <span v-if="repo.behind" class="repo-flag flag-behind">Behind</span>
                                <span v-if="!repo.unstaged && !repo.ahead && !repo.behind"
                                    class="repo-flag flag-clean">Clean</span>
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
                            <span v-if="!row.unstaged && !row.ahead && !row.behind"
                                class="repo-flag flag-clean">Clean</span>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="Operations" width="160">
                    <template #default="{ row }">
                        <el-button size="small" type="primary" plain
                            @click="openRepoDetails(row.path)">Details</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </template>
        <el-empty v-else description="No repositories found" />
    </div>
</template>