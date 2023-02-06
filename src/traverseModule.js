const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const fs = require("fs");
const { resolve, dirname, join, extname } = require("path");
const chalk = require("chalk");
const postcss = require("postcss");
const postcssLess = require("postcss-less");
const postcssScss = require("postcss-scss");
const compiler = require("vue-template-compiler");

const JS_EXTS = [".js", ".jsx", ".ts", ".tsx"];
const CSS_EXTS = [".css", ".less", ".scss"];
const JSON_EXTS = [".json"];
const VUE_EXTS = [".vue"];
//这里是获取package.json中的依赖
const PKG = require("../demo2/package.json").dependencies;
const PAKAGE_JSON = Object.keys(PKG);
let requirePathResolver = () => {};

const MODULE_TYPES = {
  JS: 1 << 0,
  CSS: 1 << 1,
  JSON: 1 << 2,
};

function isDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch (e) {}
  return false;
}

const visitedModules = new Set();

function moduleResolver(curModulePath, requirePath) {
  if (PAKAGE_JSON.includes(requirePath)) {
    return "";
  }
  let flag = false;
  if (requirePath.includes("@")) {
    flag = true;
  } else {
    flag = false;
  }
  if (typeof requirePathResolver === "function") {
    const res = requirePathResolver(dirname(curModulePath), requirePath);
    if (typeof res === "string") {
      requirePath = res;
    }
  }

  if (!flag) {
    requirePath = resolve(dirname(curModulePath), requirePath);
  }
  // 过滤掉第三方模块
  if (requirePath.includes("node_modules")) {
    return "";
  }

  requirePath = completeModulePath(requirePath);
  if (visitedModules.has(requirePath)) {
    return "";
  } else {
    visitedModules.add(requirePath);
  }
  return requirePath;
}

function completeModulePath(modulePath) {
  const EXTS = [...JSON_EXTS, ...JS_EXTS, ...VUE_EXTS];
  if (modulePath.match(/\.[a-zA-Z]+$/)) {
    return modulePath;
  }

  function tryCompletePath(resolvePath) {
    for (let i = 0; i < EXTS.length; i++) {
      let tryPath = resolvePath(EXTS[i]);
      if (fs.existsSync(tryPath)) {
        return tryPath;
      }
    }
  }
  function reportModuleNotFoundError(modulePath) {
    throw chalk.red("module not found: " + modulePath);
  }

  if (isDirectory(modulePath)) {
    const tryModulePath = tryCompletePath((ext) =>
      join(modulePath, "index" + ext)
    );
    if (!tryModulePath) {
      reportModuleNotFoundError(modulePath);
    } else {
      return tryModulePath;
    }
  } else if (!EXTS.some((ext) => modulePath.endsWith(ext))) {
    const tryModulePath = tryCompletePath((ext) => modulePath + ext);
    if (!tryModulePath) {
      console.log("modulePath===", modulePath);

      reportModuleNotFoundError(modulePath);
    } else {
      return tryModulePath;
    }
  }
  return modulePath;
}

function resolveBabelSyntaxtPlugins(modulePath) {
  const plugins = [];
  if ([".tsx", ".jsx"].some((ext) => modulePath.endsWith(ext))) {
    plugins.push("jsx");
  }
  if ([".ts", ".tsx"].some((ext) => modulePath.endsWith(ext))) {
    plugins.push("typescript");
  }
  return plugins;
}

function resolveBabelSyntaxtPlugins(modulePath) {
  const plugins = [];
  if ([".tsx", ".jsx"].some((ext) => modulePath.endsWith(ext))) {
    plugins.push("jsx");
  }
  if ([".ts", ".tsx"].some((ext) => modulePath.endsWith(ext))) {
    plugins.push("typescript");
  }
  return plugins;
}

function resolvePostcssSyntaxtPlugin(modulePath) {
  if (modulePath.endsWith(".scss")) {
    return postcssScss;
  }
  if (modulePath.endsWith(".less")) {
    return postcssLess;
  }
}

function getModuleType(modulePath) {
  const moduleExt = extname(modulePath);
  if (moduleExt === ".vue") {
    return "vue";
  }
  if (JS_EXTS.some((ext) => ext === moduleExt)) {
    return MODULE_TYPES.JS;
  } else if (CSS_EXTS.some((ext) => ext === moduleExt)) {
    return MODULE_TYPES.CSS;
  } else if (JSON_EXTS.some((ext) => ext === moduleExt)) {
    return MODULE_TYPES.JSON;
  }
}

function traverseCssModule(curModulePath, callback) {
  const moduleFileConent = fs.readFileSync(curModulePath, {
    encoding: "utf-8",
  });

  //通过ast读取css文件中的@import和url
  const ast = postcss.parse(moduleFileConent, {
    syntaxt: resolvePostcssSyntaxtPlugin(curModulePath),
  });
  ast.walkAtRules("import", (rule) => {
    const subModulePath = moduleResolver(
      curModulePath,
      rule.params.replace(/['"]/g, "")
    );
    if (!subModulePath) {
      return;
    }
    callback && callback(subModulePath);
    traverseModule(subModulePath, callback);
  });
  ast.walkDecls((decl) => {
    if (decl.value.includes("url(")) {
      const url = /.*url\((.+)\).*/.exec(decl.value)[1].replace(/['"]/g, "");
      const subModulePath = moduleResolver(curModulePath, url);
      if (!subModulePath) {
        return;
      }
      callback && callback(subModulePath);
    }
  });
}

function traverseJsModule(curModulePath, callback) {
  const moduleFileContent = fs.readFileSync(curModulePath, {
    encoding: "utf-8",
  });
  const ast = parser.parse(moduleFileContent, {
    sourceType: "unambiguous",
    plugins: resolveBabelSyntaxtPlugins(curModulePath),
  });
  traverse(ast, {
    ImportDeclaration(path) {
      //暂时先处理下@/这种路径
      const importPath = path.get("source.value").node;
      const subModulePath = moduleResolver(curModulePath, importPath);
      if (!subModulePath) {
        return;
      }
      console.log("ast===", importPath);
      callback && callback(subModulePath);
      traverseModule(subModulePath, callback);
    },
    CallExpression(path) {
      if (path.get("callee").toString() === "require") {
        const subModulePath = moduleResolver(
          curModulePath,
          path.get("arguments.0").toString().replace(/['"]/g, "")
        );
        if (!subModulePath) {
          return;
        }
        callback && callback(subModulePath);
        traverseModule(subModulePath, callback);
      }
    },
  });
}

function traverseModule(curModulePath, callback) {
  //   console.log("curModulePath===", curModulePath);
  curModulePath = completeModulePath(curModulePath);

  const moduleType = getModuleType(curModulePath);
  if (moduleType === "vue") {
    console.log("这里需要解析.vue文件", curModulePath);
    traverseVueModule(curModulePath);
  }
  if (moduleType & MODULE_TYPES.JS) {
    console.log("moduleType===", curModulePath, moduleType);
    traverseJsModule(curModulePath, callback);
  } else if (moduleType & MODULE_TYPES.CSS) {
    traverseCssModule(curModulePath, callback);
  }
}

function traverseVueModule(curModulePath, callback) {
  const moduleFileContent = fs.readFileSync(curModulePath, {
    encoding: "utf-8",
  });
  const ast = compiler.parseComponent(moduleFileContent);
  console.log("ast=======", ast);
}

module.exports.traverseModule = traverseModule;
module.exports.setRequirePathResolver = (resolver) => {
  requirePathResolver = resolver;
};
