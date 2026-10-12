import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collect(path) : /\.test\.(ts|tsx|mjs)$/.test(entry.name) ? [path] : [];
  }));
  return paths.flat();
}

const files = (await Promise.all(["app", "components", "lib", "scripts"].map(collect))).flat().sort();
if (files.length === 0) throw new Error("未找到前端测试文件");
const child = spawn(process.execPath, ["--import", "tsx", "--test", ...files], { stdio: "inherit" });
child.on("error", (error) => { console.error(error); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
