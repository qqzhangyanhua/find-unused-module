const postcss = require("postcss");
const syntax = require("postcss-scss");
const stripInlineComments = require("postcss-strip-inline-comments");
const fs = require("fs");
let css = fs.readFileSync("./1.scss", "utf8");

// const getLine = async (css) => {
//   return await postcss([stripInlineComments]).process(css, {
//     parser: syntax,
//   });
//   console.log(result.css);
// };
// getLine(css);
// // console.log();

// await getLine(css).then((result) => {
//   const ast = postcss.parse(result.css, {
//     syntaxt: syntax,
//   });
//   console.log(ast);
// });
const action = async () => {
  let val;
  await postcss([stripInlineComments])
    .process(css, { parser: syntax })
    .then((result) => {
      val = result;
    });
  console.log("111111111111111", val.css);
  return val.css;
};
const val = action();
console.log("22222222", val);
// const moduleFileConent = fs.readFileSync("../demo-project/style3.scss", {
//   encoding: "utf-8",
// });
