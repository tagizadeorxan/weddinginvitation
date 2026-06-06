import { copyFileSync, cpSync, existsSync, readdirSync, statSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, "..", "..", "docs");
const publicDir = join(__dirname, "..", "public");

if (!existsSync(join(publicDir, "wedding.mp4"))) {
  console.error("Missing store/public/wedding.mp4 — add your presentation video there.");
  process.exit(1);
}

for (const name of readdirSync(publicDir)) {
  const src = join(publicDir, name);
  const dest = join(docsDir, name);
  if (statSync(src).isDirectory()) {
    cpSync(src, dest, { recursive: true });
  } else {
    copyFileSync(src, dest);
  }
}

writeFileSync(join(docsDir, ".nojekyll"), "");
console.log("Copied public assets (wedding.mp4, robots.txt, sitemap.xml) to docs/");
