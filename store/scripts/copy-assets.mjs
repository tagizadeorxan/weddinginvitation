import { copyFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, "..", "..", "docs");
const videoSrc = join(__dirname, "..", "public", "wedding.mp4");
const videoDest = join(docsDir, "wedding.mp4");

if (!existsSync(videoSrc)) {
  console.error("Missing store/public/wedding.mp4 — add your presentation video there.");
  process.exit(1);
}

copyFileSync(videoSrc, videoDest);
writeFileSync(join(docsDir, ".nojekyll"), "");
console.log(`Copied wedding.mp4 to ${videoDest}`);
