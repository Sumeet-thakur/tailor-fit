import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tailorfit.app',
  appName: 'Tailor Fit',
  webDir: 'dist',
  // IMPORTANT: The server block below MUST be commented out for production APK builds. 
  // It is ONLY used for local live-reload testing on your phone.
  server: {
    cleartext: true,
    allowNavigation: [
      "localhost",
      "tailor-fit-darosoft-api.onrender.com"
    ]
  },
};

export default config;
