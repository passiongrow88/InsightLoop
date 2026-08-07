import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

const gitCommit = () => {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'local';
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Defines process.env for the Google GenAI SDK usage in frontend
    'process.env': process.env,
    __V5_BUILD_COMMIT__: JSON.stringify(gitCommit()),
    __V5_BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
  }
});
