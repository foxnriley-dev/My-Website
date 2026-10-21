// Expo's Metro config auto-detects the pnpm workspace (SDK 52+); no manual
// watchFolders/nodeModulesPaths are needed. @ife/server is never imported here.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
