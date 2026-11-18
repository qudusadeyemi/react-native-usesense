const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// The example consumes the plugin from the repo root (`file:..`), which npm
// links as a symlink. Metro has to watch the root to follow it, and must
// resolve react / react-native from the example only, never the root's own
// node_modules (two copies of React break the app).
const root = path.resolve(__dirname, '..');
const escape = p => p.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
    extraNodeModules: {
      'react-native-usesense': root,
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
    },
    blockList: [
      new RegExp(`^${escape(path.join(root, 'node_modules'))}[/\\\\](react|react-native)[/\\\\].*`),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
