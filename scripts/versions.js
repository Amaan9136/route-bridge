const { execSync } = require("child_process");
const packages = [
  "client",
  "config",
  "core",
  "express",
  "generator",
  "logger"
];
const scope = "@route-bridge";
for (const pkg of packages) {
  const fullName = scope ? `${scope}/${pkg}` : pkg;
  try {
    const version = execSync(`npm view ${fullName} version`, { encoding: "utf-8" }).trim();
    console.log(`"name": "${fullName}",`);
    console.log(`"version": "${version}",`);
  } catch (err) {
    console.error(`Failed to fetch version for ${fullName}`);
    console.error(err.message);
  }
}