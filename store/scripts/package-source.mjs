import { createWriteStream, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import archiver from "archiver";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productDir = join(__dirname, "..", "..", "local-product");
const outFile = join(__dirname, "..", "downloads", "wedding-invitation-source.zip");

if (!existsSync(join(productDir, "index.html"))) {
  console.error(
    "Missing local-product/index.html — keep the wedding invitation source in local-product/ (not on GitHub)."
  );
  process.exit(1);
}

const includeFiles = [
  "index.html",
  "preview.png",
  "wedding_image.png",
  "wedding_video.mp4",
  "music.mp3",
];

function addToArchive(archive, filePath, name) {
  if (existsSync(filePath)) {
    archive.file(filePath, { name });
  }
}

const output = createWriteStream(outFile);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`Created ${outFile} (${archive.pointer()} bytes)`);
});

archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);

for (const file of includeFiles) {
  addToArchive(archive, join(productDir, file), file);
}

archive.append(
  `# Wedding Invitation Source Code\n\nCustomize index.html and deploy to any static host.\nSee CONFIG block near the top of the script section.\n`,
  { name: "README.txt" }
);

archive.finalize();
