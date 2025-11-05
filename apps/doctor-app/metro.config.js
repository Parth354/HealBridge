const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../../') // Adjust if your monorepo root differs

const config = getDefaultConfig(projectRoot)

// Watch the whole monorepo so Metro can load files from packages/
config.watchFolders = [workspaceRoot]

// Resolve node_modules from the workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
]

// Needed for Yarn/PNPM workspaces & Windows symlinks
config.resolver.unstable_enableSymlinks = true
config.resolver.unstable_enablePackageExports = true

module.exports = config

