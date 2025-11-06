const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  return {
    ...config,
    resolver: {
      ...config.resolver,
      sourceExts: [...config.resolver.sourceExts, 'mjs', 'tsx', 'ts'],
    },
    watchFolders: [path.resolve(__dirname, 'src')]
  };
})();