import { createMockClient } from './mock-client.js';

export const client = createMockClient();
if (import.meta.env.DEV) {
  if (new URLSearchParams(window.location.search).get('simulateSaveFailure') === '1') {
    client.simulateNextSaveFailure();
  }
  window.__pantryDemo = {
    failNextSave: () => client.simulateNextSaveFailure(),
  };
}
