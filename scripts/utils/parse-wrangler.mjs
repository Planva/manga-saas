import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Parses the wrangler.jsonc file and returns the configuration object
 * @returns {object} The parsed wrangler configuration
 * @throws {Error} If the file cannot be read or parsed
 */
export function parseWranglerConfig() {
  const wranglerPath = path.join(__dirname, '..', '..', 'wrangler.jsonc');
  const wranglerContent = fs.readFileSync(wranglerPath, 'utf8');

  const jsonContent = stripJsonComments(wranglerContent);
  const fixedJsonContent = stripTrailingCommas(jsonContent);

  try {
    return JSON.parse(fixedJsonContent);
  } catch (error) {
    throw new Error(`Failed to parse wrangler.jsonc: ${error.message}`);
  }
}

function stripJsonComments(input) {
  let output = '';
  let inString = false;
  let stringChar = '';
  let escaped = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (inSingleLineComment) {
      if (char === '\n' || char === '\r') {
        inSingleLineComment = false;
        output += char;
      }
      continue;
    }

    if (inMultiLineComment) {
      if (char === '*' && next === '/') {
        inMultiLineComment = false;
        i += 1;
        continue;
      }
      if (char === '\n' || char === '\r') {
        output += char;
      }
      continue;
    }

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      output += char;
      continue;
    }

    if (char === '/' && next === '/') {
      inSingleLineComment = true;
      i += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inMultiLineComment = true;
      i += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function stripTrailingCommas(input) {
  let output = '';
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      output += char;
      continue;
    }

    if (char === ',') {
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) {
        j += 1;
      }
      if (input[j] === '}' || input[j] === ']') {
        continue;
      }
    }

    output += char;
  }

  return output;
}

/**
 * Gets the D1 database configuration from wrangler.jsonc
 * @returns {{ name: string, id: string } | null} The database configuration or null if not found
 */
export function getD1Database() {
  const config = parseWranglerConfig();
  const d1Config = config.d1_databases?.[0];

  if (!d1Config) {
    return null;
  }

  return {
    name: d1Config.database_name,
    id: d1Config.database_id
  };
}
