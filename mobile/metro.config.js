// Expo SDK 54 monorepo Metro config.
// https://docs.expo.dev/guides/monorepos/
//
// The shared design-token module lives OUTSIDE this project (repo-root
// `shared/`). Metro only watches the project root by default, so a relative
// import into `../../shared/...` would fail to bundle at runtime. Adding the
// repo root to `watchFolders` lets Metro see + bundle the shared module.
//
// `nodeModulesPaths` lists where Metro resolves packages from (this project
// first, then the repo root). Each sub-project keeps its own lockfile +
// node_modules (no hoisted workspace), so hierarchical lookup is left ENABLED
// (default) — do NOT set `disableHierarchicalLookup` here.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the repo root so `shared/` is part of the Metro bundle graph.
config.watchFolders = [monorepoRoot];

// 2. Resolve packages from this project first, then the repo root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
