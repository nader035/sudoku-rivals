const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/environments/environment.ts');

function readExistingEnvironment() {
  if (!fs.existsSync(targetPath)) {
    return {
      production: false,
      supabaseUrl: '',
      supabaseKey: '',
    };
  }

  const source = fs.readFileSync(targetPath, 'utf8');
  const boolMatch = source.match(/production:\s*(true|false)/);
  const urlMatch = source.match(/supabaseUrl:\s*'([^']*)'/);
  const keyMatch = source.match(/supabaseKey:\s*'([^']*)'/);

  return {
    production: boolMatch ? boolMatch[1] === 'true' : false,
    supabaseUrl: urlMatch ? urlMatch[1] : '',
    supabaseKey: keyMatch ? keyMatch[1] : '',
  };
}

const existing = readExistingEnvironment();
const resolvedProduction = process.env['NODE_ENV'] === 'production' || !!process.env['VERCEL'];
const resolvedSupabaseUrl = process.env['SUPABASE_URL'] || existing.supabaseUrl;
const resolvedSupabaseKey =
  process.env['SUPABASE_ANON_KEY'] ||
  process.env['SUPABASE_PUBLISHABLE_KEY'] ||
  existing.supabaseKey;

const envConfigFile = `export const environment = {
  production: ${resolvedProduction},
  supabaseUrl: '${resolvedSupabaseUrl}',
  supabaseKey: '${resolvedSupabaseKey}'
};
`;

console.log('Generating environment.ts...');
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, envConfigFile);
console.log(`File generated at ${targetPath}`);
