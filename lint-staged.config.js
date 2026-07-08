const path = require('node:path');

const root = __dirname;

function biomeCommand(appDir) {
  return (files) => {
    const relativeFiles = files.map((file) =>
      path.relative(path.join(root, appDir), file),
    );
    return `pnpm --dir ${appDir} exec biome check --write --no-errors-on-unmatched ${relativeFiles.join(' ')}`;
  };
}

module.exports = {
  'apps/api/**/*.{ts,js,json}': biomeCommand('apps/api'),
  'apps/web/**/*.{ts,tsx,js,jsx,json,css}': biomeCommand('apps/web'),
};
