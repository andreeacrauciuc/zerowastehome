import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FORBIDDEN = [
  "VITE_GROQ_API_KEY",
  "VITE_OCR_SPACE_API_KEY",
  "VITE_UNSPLASH_KEY",
];

const EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];
const ROOT = join(__dirname, "../../src");

let found = false;

function scan(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      scan(full);
    } else if (EXTENSIONS.includes(extname(entry))) {
      const content = readFileSync(full, "utf8");
      for (const key of FORBIDDEN) {
        if (content.includes(key)) {
          console.error(`FOUND ${key} in ${full}`);
          found = true;
        }
      }
    }
  }
}

scan(ROOT);

if (found) {
  console.error("\nScan FAILED — embedded keys detected");
  // eslint-disable-next-line no-undef
  process.exit(1);
} else {
  console.log("Scan OK — no embedded keys found");
}