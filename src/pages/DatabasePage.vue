<template>
  <div>
    <PageHeader title="Database" subtitle="Database management and operations" />
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4" v-for="card in databaseCards" :key="card.id" style="margin-bottom: 20px;">
        <el-card 
          :body-style="{ padding: '0px', cursor: 'pointer', height: '100%' }" 
          shadow="hover"
          @click="openCardDialog(card.id)"
          class="database-card"
        >
          <div class="card-content">
            <div class="card-icon-wrapper">
              <el-icon :size="48" style="color: var(--el-color-primary);">
                <component :is="card.icon" />
              </el-icon>
            </div>
            <div class="card-text-wrapper">
              <h3 class="card-title">{{ card.title }}</h3>
              <el-text class="card-description" truncated>
                {{ card.description }}
              </el-text>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Connection Management Dialog -->
    <el-dialog
      v-model="dialogs.connection"
      title="Database Connections"
      width="70%"
      :close-on-click-modal="false"
    >
      <div style="margin-bottom: 20px;">
        <el-button type="primary" @click="showAddConnection = true">
          <el-icon><Plus /></el-icon>
          Add Connection
        </el-button>
      </div>
      
      <el-table :data="connections" border style="width: 100%">
        <el-table-column prop="name" label="Connection Name" width="180" />
        <el-table-column prop="host" label="Host" width="150" />
        <el-table-column prop="port" label="Port" width="80" />
        <el-table-column prop="database" label="Database" />
        <el-table-column prop="status" label="Status" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'connected' ? 'success' : 'danger'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="testConnection(row)">Test</el-button>
            <el-button size="small" type="danger" @click="deleteConnection(row)">Delete</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- Query Tool Dialog -->
    <el-dialog
      v-model="dialogs.query"
      title="SQL Query Tool"
      width="80%"
      :close-on-click-modal="false"
    >
      <el-form :model="queryForm" label-width="120px">
        <el-form-item label="Connection">
          <el-select v-model="queryForm.connection" placeholder="Select connection" style="width: 100%">
            <el-option v-for="conn in connections" :key="conn.id" :label="conn.name" :value="conn.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="SQL Query">
          <el-input
            v-model="queryForm.sql"
            type="textarea"
            :rows="8"
            placeholder="Enter your SQL query here..."
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="executeQuery" :loading="queryLoading">
            <el-icon><Position /></el-icon>
            Execute Query
          </el-button>
          <el-button @click="clearQuery">Clear</el-button>
        </el-form-item>
      </el-form>
      
      <div v-if="queryResults.length > 0" style="margin-top: 20px;">
        <h4>Query Results:</h4>
        <el-table :data="queryResults" border style="width: 100%; max-height: 300px; overflow-y: auto;">
          <el-table-column 
            v-for="column in queryColumns" 
            :key="column" 
            :prop="column" 
            :label="column" 
          />
        </el-table>
      </div>
    </el-dialog>

    <!-- Data Import Dialog -->
    <el-dialog
      v-model="dialogs.import"
      title="Data Import"
      width="60%"
      :close-on-click-modal="false"
    >
      <el-form :model="importForm" label-width="120px">
        <el-form-item label="Target Connection">
          <el-select v-model="importForm.connection" placeholder="Select connection" style="width: 100%">
            <el-option v-for="conn in connections" :key="conn.id" :label="conn.name" :value="conn.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Import File">
          <el-upload
            class="upload-demo"
            drag
            action="#"
            :auto-upload="false"
            :on-change="handleImportFile"
            accept=".sql,.csv,.json"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              Drop file here or <em>click to upload</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                Supported formats: SQL, CSV, JSON
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="startImport" :loading="importLoading">
            <el-icon><Upload /></el-icon>
            Start Import
          </el-button>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- Backup & Restore Dialog -->
    <el-dialog
      v-model="dialogs.backup"
      title="Backup & Restore"
      width="70%"
      :close-on-click-modal="false"
    >
      <el-tabs v-model="backupTab">
        <el-tab-pane label="Backup" name="backup">
          <el-form :model="backupForm" label-width="120px">
            <el-form-item label="Source Connection">
              <el-select v-model="backupForm.connection" placeholder="Select connection" style="width: 100%">
                <el-option v-for="conn in connections" :key="conn.id" :label="conn.name" :value="conn.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="Backup Type">
              <el-radio-group v-model="backupForm.type">
                <el-radio label="full">Full Database</el-radio>
                <el-radio label="structure">Structure Only</el-radio>
                <el-radio label="data">Data Only</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="createBackup" :loading="backupLoading">
                <el-icon><Download /></el-icon>
                Create Backup
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="Restore" name="restore">
          <el-form :model="restoreForm" label-width="120px">
            <el-form-item label="Target Connection">
              <el-select v-model="restoreForm.connection" placeholder="Select connection" style="width: 100%">
                <el-option v-for="conn in connections" :key="conn.id" :label="conn.name" :value="conn.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="Backup File">
              <el-upload
                class="upload-demo"
                drag
                action="#"
                :auto-upload="false"
                :on-change="handleRestoreFile"
                accept=".sql,.bak"
              >
                <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                <div class="el-upload__text">
                  Drop backup file here or <em>click to upload</em>
                </div>
              </el-upload>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="startRestore" :loading="restoreLoading">
                <el-icon><Refresh /></el-icon>
                Start Restore
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <!-- Schema Designer Dialog -->
    <el-dialog
      v-model="dialogs.schema"
      title="Schema Designer"
      width="80%"
      :close-on-click-modal="false"
    >
      <el-alert
        title="Schema Designer"
        type="info"
        description="Visual database schema design tool - coming soon!"
        :closable="false"
        style="margin-bottom: 20px;"
      />
      <div style="text-align: center; padding: 40px;">
        <el-icon :size="64" style="color: var(--el-color-info);">
          <EditPen />
        </el-icon>
        <p style="margin-top: 20px; color: var(--el-text-color-regular);">
          This feature is under development. You'll be able to design database schemas visually!
        </p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import PageHeader from '../components/PageHeader.vue';
import { 
  Coin, 
  Connection, 
  EditPen, 
  Upload, 
  Download, 
  Position, 
  Plus, 
  Refresh,
  UploadFilled
} from '@element-plus/icons-vue';
import { ElMessage, ElText } from 'element-plus';

interface DatabaseCard {
  id: string;
  title: string;
  description: string;
  icon: any;
}

interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  status: 'connected' | 'disconnected';
}

const databaseCards = ref<DatabaseCard[]>([
  {
    id: 'connection',
    title: 'Connection Management',
    description: 'Manage database connections and connection pools with advanced configuration options for different database types including MySQL, PostgreSQL, SQLite, and more database systems',
    icon: Connection
  },
  {
    id: 'query',
    title: 'SQL Query Tool',
    description: 'Execute SQL queries and view results',
    icon: EditPen
  },
  {
    id: 'import',
    title: 'Data Import',
    description: 'Import data from various file formats',
    icon: Upload
  },
  {
    id: 'backup',
    title: 'Backup & Restore',
    description: 'Create backups and restore databases',
    icon: Download
  },
  {
    id: 'schema',
    title: 'Schema Designer',
    description: 'Design and visualize database schemas',
    icon: EditPen
  }
]);

const dialogs = reactive({
  connection: false,
  query: false,
  import: false,
  backup: false,
  schema: false
});

const connections = ref<Connection[]>([
  {
    id: '1',
    name: 'Local MySQL',
    host: 'localhost',
    port: 3306,
    database: 'test_db',
    status: 'connected'
  },
  {
    id: '2',
    name: 'Production DB',
    host: '192.168.1.100',
    port: 5432,
    database: 'prod_db',
    status: 'disconnected'
  }
]);

const queryForm = reactive({
  connection: '',
  sql: ''
});

const queryResults = ref<any[]>([]);
const queryColumns = ref<string[]>([]);
const queryLoading = ref(false);

const importForm = reactive({
  connection: '',
  file: null as File | null
});

const importLoading = ref(false);

const backupTab = ref('backup');

const backupForm = reactive({
  connection: '',
  type: 'full'
});

const backupLoading = ref(false);

const restoreForm = reactive({
  connection: '',
  file: null as File | null
});

const restoreLoading = ref(false);

const showAddConnection = ref(false);

function openCardDialog(cardId: string) {
  switch (cardId) {
    case 'connection':
      dialogs.connection = true;
      break;
    case 'query':
      dialogs.query = true;
      break;
    case 'import':
      dialogs.import = true;
      break;
    case 'backup':
      dialogs.backup = true;
      break;
    case 'schema':
      dialogs.schema = true;
      break;
  }
}

function testConnection(connection: Connection) {
  ElMessage.success(`Testing connection to ${connection.name}...`);
  // Simulate connection test
  setTimeout(() => {
    connection.status = Math.random() > 0.5 ? 'connected' : 'disconnected';
    ElMessage.success(`Connection test completed for ${connection.name}`);
  }, 1000);
}

function deleteConnection(connection: Connection) {
  const index = connections.value.findIndex(c => c.id === connection.id);
  if (index > -1) {
    connections.value.splice(index, 1);
    ElMessage.success(`Connection ${connection.name} deleted`);
  }
}

function executeQuery() {
  if (!queryForm.connection || !queryForm.sql) {
    ElMessage.warning('Please select a connection and enter SQL query');
    return;
  }
  
  queryLoading.value = true;
  ElMessage.info('Executing query...');
  
  // Simulate query execution
  setTimeout(() => {
    queryResults.value = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ];
    queryColumns.value = ['id', 'name', 'email'];
    queryLoading.value = false;
    ElMessage.success('Query executed successfully');
  }, 1500);
}

function clearQuery() {
  queryForm.sql = '';
  queryResults.value = [];
  queryColumns.value = [];
}

function handleImportFile(file: File) {
  importForm.file = file;
  ElMessage.info(`Selected file: ${file.name}`);
  return false; // Prevent auto upload
}

function startImport() {
  if (!importForm.connection || !importForm.file) {
    ElMessage.warning('Please select a connection and file');
    return;
  }
  
  importLoading.value = true;
  ElMessage.info('Starting import...');
  
  setTimeout(() => {
    importLoading.value = false;
    ElMessage.success('Import completed successfully');
    dialogs.import = false;
  }, 2000);
}

function createBackup() {
  if (!backupForm.connection) {
    ElMessage.warning('Please select a connection');
    return;
  }
  
  backupLoading.value = true;
  ElMessage.info('Creating backup...');
  
  setTimeout(() => {
    backupLoading.value = false;
    ElMessage.success('Backup created successfully');
  }, 2500);
}

function handleRestoreFile(file: File) {
  restoreForm.file = file;
  ElMessage.info(`Selected backup file: ${file.name}`);
  return false; // Prevent auto upload
}

function startRestore() {
  if (!restoreForm.connection || !restoreForm.file) {
    ElMessage.warning('Please select a connection and backup file');
    return;
  }
  
  restoreLoading.value = true;
  ElMessage.info('Starting restore...');
  
  setTimeout(() => {
    restoreLoading.value = false;
    ElMessage.success('Restore completed successfully');
    dialogs.backup = false;
  }, 3000);
}
</script>

<style scoped>
.database-card {
  transition: all 0.3s ease;
  border: 1px solid var(--el-border-color-light);
  height: 200px; /* Fixed height for all cards */
  display: flex;
  flex-direction: column;
}

.database-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.database-card:active {
  transform: translateY(0);
}

.card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px 20px;
}

.card-icon-wrapper {
  text-align: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.card-text-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 0 16px;
  width: 100%;
}

.card-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  min-height: 44px; /* Ensure consistent title height */
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-description {
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.5;
  min-height: 42px; /* Ensure consistent description height */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 100%;
}

.upload-demo {
  width: 100%;
}

:deep(.el-upload-dragger) {
  width: 100%;
}

/* Ensure el-col maintains consistent height */
:deep(.el-col) {
  display: flex;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .database-card {
    height: 180px;
  }
  
  .card-content {
    padding: 20px 16px;
  }
  
  .card-title {
    font-size: 15px;
    min-height: 40px;
  }
  
  .card-description {
    font-size: 13px;
    min-height: 38px;
  }
}

@media (max-width: 480px) {
  .database-card {
    height: 160px;
  }
  
  .card-content {
    padding: 16px 12px;
  }
  
  .card-title {
    font-size: 14px;
    min-height: 36px;
    margin-bottom: 8px;
  }
  
  .card-description {
    font-size: 12px;
    min-height: 34px;
  }
}
</style>