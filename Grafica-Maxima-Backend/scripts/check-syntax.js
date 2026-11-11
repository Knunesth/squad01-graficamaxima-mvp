const { readdirSync } = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" ? [] : javascriptFiles(filename);
    }
    return entry.isFile() && entry.name.endsWith(".js") ? [filename] : [];
  });
}

const files = javascriptFiles(root);
for (const filename of files) {
  const result = spawnSync(process.execPath, ["--check", filename], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Sintaxe verificada em ${files.length} arquivos JavaScript.`);
