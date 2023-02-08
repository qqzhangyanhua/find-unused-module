const postcss = require("postcss");
const syntax = require("postcss-scss");
const stripInlineComments = require("postcss-strip-inline-comments");
const fs = require("fs");
let css = fs.readFileSync("./1.scss", "utf8");

// const action = async () => {
//   let val;
//   await postcss([stripInlineComments])
//     .process(css, { parser: syntax })
//     .then((result) => {
//       val = result;
//     });
//   console.log("111111111111111", val.css);
//   return val.css;
// };
// const val = action();
// console.log("22222222", val);

// const moduleFileConent = fs.readFileSync("../demo-project/style3.scss", {
//   encoding: "utf-8",
// });

const processCss = (css) => {
  return postcss([stripInlineComments]).process(css, { parser: syntax }).css;
};
// const ast = postcss.plugin("stripInlineComments", (result) => {
//   console.log("result======", result);
// });
console.log("ast============", processCss(css));
