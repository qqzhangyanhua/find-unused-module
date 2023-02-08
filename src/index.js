const { resolve, normalize } = require("path");
const fastGlob = require("fast-glob");
const { traverseModule, setRequirePathResolver } = require("./traverseModule");

const defaultOptions = {
  cwd: "",
  entries: [],
  includes: ["**/*", "!node_modules"],
  resolveRequirePath: () => {},
};

function findUnusedModule(options) {
  let { cwd, entries, includes, resolveRequirePath } = Object.assign(
    defaultOptions,
    options
  );

  includes = includes.map((includePath) =>
    cwd ? `${cwd}/${includePath}` : includePath
  );
  //匹配所有的文件
  const allFiles = fastGlob.sync(includes).map((item) => normalize(item));
  const entryModules = [];
  const usedModules = [];

  setRequirePathResolver(resolveRequirePath);
  const traverseM = async () => {
    for (let i = 0; i < entries.length; i++) {
      const entryPath = resolve(cwd, entries[i]);
      traverseModule(entryPath, (modulePath) => {
        usedModules.push(modulePath);
      });
      entryModules.push(entryPath);
    }
  };

  traverseM();
  // entries.forEach((entry) => {
  //   const entryPath = resolve(cwd, entry);
  //   entryModules.push(entryPath);
  //   traverseModule(entryPath, (modulePath) => {
  //     usedModules.push(modulePath);
  //   });
  // });

  const unusedModules = allFiles.filter((filePath) => {
    //获取所有的文件列表，然后过滤掉已经使用的文件
    const resolvedFilePath = resolve(filePath);
    return (
      !entryModules.includes(resolvedFilePath) &&
      !usedModules.includes(resolvedFilePath)
    );
  });
  // console.log(unusedModules.length);
  return {
    all: allFiles,
    used: usedModules,
    unused: unusedModules,
  };
}

module.exports = findUnusedModule;
