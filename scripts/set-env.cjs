const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/environments/environment.ts');

const envConfigFile = `export const environment = {
  production: ${process.env['NODE_ENV'] === 'production' || !!process.env['VERCEL']},
  supabaseUrl: '${process.env['SUPABASE_URL'] || ''}',
  supabaseKey: '${process.env['SUPABASE_ANON_KEY'] || ''}'
};
`;

console.log('Generating environment.ts...');
fs.writeFileSync(targetPath, envConfigFile);
console.log(`File generated at ${targetPath}`);
