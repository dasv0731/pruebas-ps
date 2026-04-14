const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const target = path.join(root, 'amplify_outputs.json');
const example = path.join(root, 'amplify_outputs.example.json');

if (fs.existsSync(target)) {
  process.exit(0);
}
if (!fs.existsSync(example)) {
  console.error('Missing amplify_outputs.example.json');
  process.exit(1);
}
fs.copyFileSync(example, target);
console.warn(
  'amplify_outputs.json was missing: copied amplify_outputs.example.json (stub). ' +
    'Run `npx ampx sandbox` for a real backend config.'
);
