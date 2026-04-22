const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const packages = [
  "client",
  "config",
  "core",
  "express",
  "generator",
  "logger"
];
function bump(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}
for (const pkg of packages) {
  const pkgDir = path.join(__dirname, "..", "packages", pkg);
  const pkgFile = path.join(pkgDir, "package.json");
  const data = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
  const newVersion = bump(data.version);
  data.version = newVersion;
  fs.writeFileSync(pkgFile, JSON.stringify(data, null, 2));
  console.log(`Publishing ${data.name}@${newVersion}`);
  execSync("npm publish --access public", {
    cwd: pkgDir,
    stdio: "inherit"
  });
}