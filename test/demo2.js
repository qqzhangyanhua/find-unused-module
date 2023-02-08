const chalk = require("chalk");
const findUnusedModule = require("../src/index");
const path = require("path");
const pkgJson = ["vue"];

const { all, used, unused } = findUnusedModule({
  cwd: process.cwd(),
  entries: ["./demo2/src/entry/index.js"],
  includes: ["./demo2/src/**/*"],
  // entries: ["./demo2/src/entry/index.js"],
  // includes: ["./demo2/src/**/*"],
  resolveRequirePath(curDir, requirePath) {
    if (pkgJson.includes(requirePath)) {
      return false;
    }

    if (requirePath.includes("test")) {
      console.log("------------------", requirePath);

      return false;
    }
    if (requirePath.startsWith("@/")) {
      const pathStr = path.resolve(
        `${process.cwd()}/demo2/src`,
        requirePath.replace("@/", "./")
      );
      return pathStr;
    }
    if (requirePath.startsWith("@view")) {
      const pathStr = path.resolve(
        `${process.cwd()}/demo2/src`,
        requirePath.replace("@view", "./views")
      );
      return pathStr;
    }
    //先判断是否包含快捷路径以@开头
    if (requirePath.includes("@")) {
      //如果包含快捷路径，则将快捷路径替换成真实路径
      return path.resolve(curDir, requirePath.replace("@", "./"));
    }
    return requirePath;
  },
});

console.log(chalk.blue("used modules:"));
console.log(used);
console.log(chalk.yellow("unused modules:"));
console.log(unused);

console.log("unused==", unused.length);
