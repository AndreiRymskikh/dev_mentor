import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Author-owned UI and executable documentation; generated/vendor files are omitted.
const patterns = [
  ['literal color', /#[\da-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|color)\s*\(|\b(?:background|color|border-color)\s*:\s*(?:white|black|red|green|blue|gray|grey)\b/gi],
  ['Tailwind palette', /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|shadow|decoration|accent|caret)-(?:white|black|transparent|current|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})(?:\/[\d.]+)?\b/g],
  ['arbitrary Tailwind value', /\b[\w-]+-\[[^\]\n]+\]|\[(?:padding|margin|color|background|width|height):[^\]\n]+\]/g],
  ['raw token consumption', /var\(\s*--raw-[\w-]+\s*\)/g],
];

export function violations(source, filename) {
  if (filename.split(path.sep).join('/') === 'src/tokens.css') return [];
  return source.split('\n').flatMap((line, index) => patterns.flatMap(([rule, pattern]) => {
    pattern.lastIndex = 0;
    return [...line.matchAll(pattern)].map(match => ({ file: filename, line: index + 1, rule, value: match[0] }));
  }));
}

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return ['node_modules', 'storybook-static', 'public'].includes(entry.name) ? [] : files(full);
    return /\.(?:css|tsx?|mdx|md)$/.test(entry.name) ? [full] : [];
  });
}

export function check(root = packageRoot) {
  const findings = ['src', '.storybook', 'docs'].flatMap(folder => {
    const directory = path.join(root, folder);
    return fs.existsSync(directory) ? files(directory).flatMap(file => violations(fs.readFileSync(file, 'utf8'), path.relative(root, file))) : [];
  });
  return findings;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const findings = check();
  for (const finding of findings) console.error(`${finding.file}:${finding.line}: ${finding.rule}: ${finding.value}`);
  console.log(findings.length ? `${findings.length} token violation(s).` : 'Token guard passed: no colors outside tokens, palette classes, arbitrary Tailwind values or raw-token consumption.');
  process.exitCode = findings.length ? 1 : 0;
}
