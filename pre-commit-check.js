const { execSync } = require('child_process');

try {
  console.log("Running TSC check...");
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log("Running build...");
  execSync('npm run build', { stdio: 'inherit' });
  console.log("Running tests...");
  execSync('npm test', { stdio: 'inherit' });
  console.log("Pre-commit checks passed!");
} catch (e) {
  console.error("Pre-commit checks failed!");
  process.exit(1);
}
