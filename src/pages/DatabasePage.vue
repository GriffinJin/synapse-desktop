<template>
  <div>
    <PageHeader title="Database" subtitle="Database management and operations" />
    
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; margin-top: 20px;">
      <div 
        v-for="card in databaseCards" 
        :key="card.id" 
        class="database-card"
        @click="openCardDialog(card.id)"
      >
        <div class="card-icon-wrapper">
          <span class="codicon" :class="card.iconClass" style="font-size: 48px; color: var(--vscode-accent);"></span>
        </div>
        <div class="card-text-wrapper">
          <h3 class="card-title">{{ card.title }}</h3>
          <p class="card-description">{{ card.description }}</p>
        </div>
      </div>
    </div>

    <!-- Connection Management Modal -->
    <div v-if="dialogs.connection" class="modal-overlay" @click="dialogs.connection = false">
      <div class="modal-container" @click.stop style="width: 70%; max-width: 1000px;">
        <div class="modal-header">
          Database Connections
          <vscode-button appearance="icon" @click="dialogs.connection = false" style="float: right;">
            <span class="codicon codicon-close"></span>
          </vscode-button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 20px;">
            <vscode-button appearance="primary" @click="showAddConnection = true">
              <span class="codicon codicon-add"></span> Add Connection
            </vscode-button>
          </div>
          
          <table class="vscode-table">
            <thead>
              <tr>
                <th>Connection Name</th>
                <th>Host</th>
                <th>Port</th>
                <th>Database</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in connections" :key="row.id">
                <td>{{ row.name }}</td>
                <td>{{ row.host }}</td>
                <td>{{ row.port }}</td>
                <td>{{ row.database }}</td>
                <td>
                  <vscode-tag :class="row.status === 'connected' ? 'status-tag success' : 'status-tag error'">
                    {{ row.status }}
                  </vscode-tag>
                </td>
                <td>
                  <vscode-button @click="testConnection(row)">Test</vscode-button>
                  <vscode-button appearance="secondary" @click="deleteConnection(row)">Delete</vscode-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Query Tool Modal -->
    <div v-if="dialogs.query" class="modal-overlay" @click="dialogs.query = false">
      <div class="modal-container" @click.stop style="width: 80%; max-width: 1200px;">
        <div class="modal-header">
          SQL Query Tool
          <vscode-button appearance="icon" @click="dialogs.query = false" style="float: right;">
            <span class="codicon codicon-close"></span>
          </vscode-button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Connection</label>
            <vscode-dropdown style="width: 100%;">
              <vscode-option v-for="conn in connections" :key="conn.id" :value="conn.id">{{ conn.name }}</vscode-option>
            </vscode-dropdown>
          </div>
          <div class="form-group">
            <label>SQL Query</label>
            <vscode-text-area v-model="queryForm.sql" :rows="8" placeholder="Enter your SQL query here..." resize="vertical" />
          </div>
          <div style="display: flex; gap: 8px;">
            <vscode-button appearance="primary" @click="executeQuery" :disabled="queryLoading">
              <span class="codicon codicon-play"></span> Execute Query
            </vscode-button>
            <vscode-button @click="clearQuery">Clear</vscode-button>
          </div>
          
          <div v-if="queryResults.length > 0" style="margin-top: 20px;">
            <h4>Query Results:</h4>
            <table class="vscode-table">
              <thead>
                <tr>
                  <th v-for="column in queryColumns" :key="column">{{ column }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in queryResults" :key="idx">
                  <td v-for="column in queryColumns" :key="column">{{ row[column] }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Other dialogs simplified for brevity -->
    <div v-if="dialogs.import" class="modal-overlay" @click="dialogs.import = false">
      <div class="modal-container" @click.stop style="width: 60%;">
        <div class="modal-header">Data Import</div>
        <div class="modal-body">
          <p style="text-align: center; padding: 40px; color: var(--vscode-text-secondary);">
            Data Import functionality - Coming soon
          </p>
        </div>
        <div class="modal-footer">
          <vscode-button @click="dialogs.import = false">Close</vscode-button>
        </div>
      </div>
    </div>

    <div v-if="dialogs.backup" class="modal-overlay" @click="dialogs.backup = false">
      <div class="modal-container" @click.stop style="width: 70%;">
        <div class="modal-header">Backup & Restore</div>
        <div class="modal-body">
          <p style="text-align: center; padding: 40px; color: var(--vscode-text-secondary);">
            Backup & Restore functionality - Coming soon
          </p>
        </div>
        <div class="modal-footer">
          <vscode-button @click="dialogs.backup = false">Close</vscode-button>
        </div>
      </div>
    </div>

    <div v-if="dialogs.schema" class="modal-overlay" @click="dialogs.schema = false">
      <div class="modal-container" @click.stop style="width: 80%;">
        <div class="modal-header">Schema Designer</div>
        <div class="modal-body">
          <p style="text-align: center; padding: 40px; color: var(--vscode-text-secondary);">
            Visual database schema design tool - Coming soon!
          </p>
        </div>
        <div class="modal-footer">
          <vscode-button @click="dialogs.schema = false">Close</vscode-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import PageHeader from '../components/PageHeader.vue';

interface DatabaseCard {
  id: string;
  title: string;
  description: string;
  iconClass: string;
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
    description: 'Manage database connections and connection pools',
    iconClass: 'codicon-plug'
  },
  {
    id: 'query',
    title: 'SQL Query Tool',
    description: 'Execute SQL queries and view results',
    iconClass: 'codicon-code'
  },
  {
    id: 'import',
    title: 'Data Import',
    description: 'Import data from various file formats',
    iconClass: 'codicon-cloud-upload'
  },
  {
    id: 'backup',
    title: 'Backup & Restore',
    description: 'Create backups and restore databases',
    iconClass: 'codicon-cloud-download'
  },
  {
    id: 'schema',
    title: 'Schema Designer',
    description: 'Design and visualize database schemas',
    iconClass: 'codicon-symbol-structure'
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
  console.log(`Testing connection to ${connection.name}...`);
  setTimeout(() => {
    connection.status = Math.random() > 0.5 ? 'connected' : 'disconnected';
    console.log(`Connection test completed for ${connection.name}`);
  }, 1000);
}

function deleteConnection(connection: Connection) {
  const index = connections.value.findIndex(c => c.id === connection.id);
  if (index > -1) {
    connections.value.splice(index, 1);
    console.log(`Connection ${connection.name} deleted`);
  }
}

function executeQuery() {
  if (!queryForm.connection || !queryForm.sql) {
    alert('Please select a connection and enter SQL query');
    return;
  }
  
  queryLoading.value = true;
  console.log('Executing query...');
  
  setTimeout(() => {
    queryResults.value = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ];
    queryColumns.value = ['id', 'name', 'email'];
    queryLoading.value = false;
    console.log('Query executed successfully');
  }, 1500);
}

function clearQuery() {
  queryForm.sql = '';
  queryResults.value = [];
  queryColumns.value = [];
}
</script>

<style scoped>
.database-card {
  background-color: var(--vscode-sidebar-bg);
  border: 1px solid var(--vscode-border);
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 200px;
}

.database-card:hover {
  transform: translateY(-2px);
  background-color: var(--vscode-hover-bg);
  border-color: var(--vscode-accent);
}

.card-icon-wrapper {
  margin-bottom: 16px;
}

.card-text-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-text);
}

.card-description {
  margin: 0;
  color: var(--vscode-text-secondary);
  font-size: 13px;
  line-height: 1.5;
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

.codicon-plug::before { content: '\eb4c'; }
.codicon-code::before { content: '\eb38'; }
.codicon-cloud-upload::before { content: '\eb41'; }
.codicon-cloud-download::before { content: '\eb40'; }
.codicon-symbol-structure::before { content: '\eb74'; }
.codicon-add::before { content: '\eb2c'; }
.codicon-close::before { content: '\eb39'; }
.codicon-play::before { content: '\eb7d'; }
</style>
