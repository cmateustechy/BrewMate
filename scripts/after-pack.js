const { execSync } = require('child_process');

exports.default = async function(context) {
  const appOutDir = context.appOutDir;
  console.log('Running xattr -cr on', appOutDir);
  try {
    execSync(`xattr -cr "${appOutDir}"`);
  } catch (e) {
    console.error('xattr failed', e.message);
  }
};
