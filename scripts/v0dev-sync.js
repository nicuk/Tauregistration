// v0dev-sync.js
// Simple script to help sync v0.dev changes with local development
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const V0_DEPLOYMENT_URL = 'https://v0-form-filling-rfy3icx2q-nicuks-projects.vercel.app';
const COMPONENTS_DIR = path.join(__dirname, '..', 'components', 'v0');

// Ensure the v0 components directory exists
if (!fs.existsSync(COMPONENTS_DIR)) {
  fs.mkdirSync(COMPONENTS_DIR, { recursive: true });
  console.log(`Created directory: ${COMPONENTS_DIR}`);
}

// Function to commit and push changes
function commitAndPush(message) {
  try {
    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log('✅ Changes committed and pushed to GitHub');
  } catch (error) {
    console.error('❌ Error committing changes:', error.message);
  }
}

// Main function
function main() {
  console.log(`
=================================================
🔄 v0.dev Sync Tool for TAUMine Project
=================================================
This tool helps you sync v0.dev components with your local project.

Your v0.dev deployment: ${V0_DEPLOYMENT_URL}
Local components directory: ${COMPONENTS_DIR}

Options:
1. After copying v0.dev component code to your local project,
   run 'node scripts/v0dev-sync.js push' to commit and push changes.

2. To check deployment status, visit:
   ${V0_DEPLOYMENT_URL}
=================================================
`);

  // Handle command line arguments
  const command = process.argv[2];
  
  if (command === 'push') {
    const componentName = process.argv[3] || 'v0dev component';
    commitAndPush(`Add/update ${componentName} from v0.dev`);
  } else {
    console.log('Usage: node scripts/v0dev-sync.js push [componentName]');
  }
}

main();
