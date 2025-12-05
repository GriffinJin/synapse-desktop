import { createApp } from "vue";
import './index.css';
import App from './App.vue';
import router from './router';

// Register VSCode UI Toolkit components
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeDataGrid,
  vsCodeDataGridCell,
  vsCodeDataGridRow,
  vsCodeDivider,
  vsCodeDropdown,
  vsCodeLink,
  vsCodeOption,
  vsCodePanels,
  vsCodePanelTab,
  vsCodePanelView,
  vsCodeProgressRing,
  vsCodeRadio,
  vsCodeRadioGroup,
  vsCodeTextArea,
  vsCodeTextField,
  vsCodeTag,
  vsCodeBadge,
} from "@vscode/webview-ui-toolkit";

provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeCheckbox(),
  vsCodeDataGrid(),
  vsCodeDataGridCell(),
  vsCodeDataGridRow(),
  vsCodeDivider(),
  vsCodeDropdown(),
  vsCodeLink(),
  vsCodeOption(),
  vsCodePanels(),
  vsCodePanelTab(),
  vsCodePanelView(),
  vsCodeProgressRing(),
  vsCodeRadio(),
  vsCodeRadioGroup(),
  vsCodeTextArea(),
  vsCodeTextField(),
  vsCodeTag(),
  vsCodeBadge()
);

const app = createApp(App);
app.use(router);
app.mount("#app");
