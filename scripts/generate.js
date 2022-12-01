const { promises: fs } = require("fs");
const path = require("path");
const svgo = require("svgo");
const { TemplateParser, ComponentParser } = require("jinge-compiler");
const { execSync, exec } = require("child_process");

TemplateParser.aliasManager.initialize();

const SVG_DIR = path.resolve(
  __dirname,
  "../.tmp/material-design-icons/symbols/web"
);
const LIB_DIR = path.resolve(__dirname, "../lib");
const SRC_DIR = path.resolve(__dirname, "../src");
const ROOT_DIR = path.resolve(__dirname, "../");
const SVG_WEIGHTS = new Array(7).fill(0).map((n, i) => (i + 1) * 100);
const SVG_GRADS = ['N25', 0, 200];
const SVG_SIZES = [20, 24, 40, 48];
const SVG_FILLS = [0, 1];
const SVG_TYPES = ["outlined", "rounded", "sharp"];

execSync(`rm -rf ${LIB_DIR} && mkdir ${LIB_DIR}`);
SVG_TYPES.forEach((type) => {
  execSync(`rm -rf ${path.join(ROOT_DIR, type)}`);
  SVG_SIZES.forEach((size) => {
    execSync(`mkdir -p ${path.join(ROOT_DIR, type, size.toString())}`);
  });
});

async function handleIcon(icon, iconType, iconSize) {
  const icon_src_dir = path.join(SVG_DIR, icon, `materialsymbols${iconType}`);
  let jsCode = '';
  let dtsCode = '';
  for await(const w of SVG_WEIGHTS) {
    for await(const g of SVG_GRADS) {
      for await(const f of SVG_FILLS) {
        const tag = `${w === 400 ? '' : 'wght' + w}${g === 0 ? '' : 'grad' + g}${f === 0 ? '' : 'fill1'}`;
        const filepath = path.join(icon_src_dir, `${icon}${tag ? '_' + tag : ''}_${iconSize}px.svg`);
        const filecnt = await fs.readFile(filepath);
        const svg = svgo.optimize(filecnt, {
          plugins: [
            "removeTitle",
            {
              name: "removeUselessStrokeAndFill",
              params: {
                removeNone: true,
                removeUseless: true,
              },
            },
            "collapseGroups",
          ],
        });
        if (svg.error) {
          console.error(`[error] ${file} svgo error:`, svg.error);
          continue;
        }
        const result = TemplateParser.parse(svg.data.replace(/<g\/>/g, ""), {
          resourcePath: filepath,
          emitErrorFn: (err) => console.error(err),
        });
        const ic = `${icon}${tag ? '_' + tag : ''}`;
        let code =
          result.code
            .replace("export default", `const svg_${ic} =`) +
          `\nexport class Ic_${ic} extends Icon {
  constructor(attrs) {
    attrs[__].slots = { default: svg_${ic} };
    super(attrs);
  }
}`;
        if (jsCode.length > 0) {
          code = code.replace(/import[^\n]+/g, "");
        }
        jsCode += code + '\n';
        dtsCode += `export class Ic_${ic} extends Icon {}\n`;
      }
    }
  }
  
  await Promise.all([
    fs.writeFile(
      path.join(ROOT_DIR, iconType, iconSize.toString(), `${icon}.js`),
      `import { __ } from 'jinge';\nimport { Icon, IconSet, ICON_SET } from 'jinge-symbols-base';\n` + jsCode + `export class Ics_${icon} extends IconSet {
  constructor(attrs) {
    attrs[ICON_SET] = { normal: svg_${icon}, hover: svg_${icon}_wght600, active: svg_${icon}_fill1, activeHover: svg_${icon}_wght600fill1 };
    super(attrs);
  }
}`
    ),
    fs.writeFile(
      path.join(ROOT_DIR, iconType, iconSize.toString(), `${icon}.d.ts`),
      `import { Icon, IconSet } from 'jinge-symbols-base'\n` + dtsCode + `export class Ics_${icon} extends IconSet {}`
    ),
  ]);

  console.log(`    ${icon} finished.`);
}

async function handleLib(name) {
  let cnt = await fs.readFile(path.join(SRC_DIR, name + ".js"), "utf-8");
  let result = ComponentParser.parse(cnt, undefined, {
    resourcePath: name + ".js",
  });
  await fs.writeFile(
    path.join(LIB_DIR, name + ".js"),
    result.code.replace(`'./${name}.html'`, `'./${name}.tpl.js'`)
  );

  cnt = await fs.readFile(path.join(SRC_DIR, name + ".html"), "utf-8");
  result = TemplateParser.parse(cnt, { resourcePath: name + ".html", emitErrorFn: (err) => console.error(err) });
  await fs.writeFile(path.join(LIB_DIR, name + ".tpl.js"), result.code);
}

(async () => {
  console.log("start generating...");
  
  execSync(`cp ${SRC_DIR}/icon.css ${SRC_DIR}/index.d.ts ${SRC_DIR}/index.js ${LIB_DIR}`);
  await handleLib('icon');
  await handleLib('icon_set');

  const pkg = require('../package.json');
  delete pkg.devDependencies;
  pkg.dependencies = {
    'jinge-symbols-base': `^${pkg.version}`,
  };
  pkg.main = 'index.js';
  delete pkg.scripts;

  const icons = await fs.readdir(SVG_DIR);
  await fs.writeFile(
    path.resolve(__dirname, `../compiler/icons.js`),
    `module.exports = ${JSON.stringify(icons)};`
  );
  console.log('base lib finished.');
  for await(const iconType of SVG_TYPES) {
    console.log(`start generating ${iconType}...`);
    for await(const iconSize of SVG_SIZES) {
      pkg.name = `jinge-symbols${iconType === 'outlined' && iconSize === 24 ? '' : `-${iconType}-${iconSize}`}`;
      const dir = path.join(ROOT_DIR, iconType, iconSize.toString());
      execSync(`mkdir ${path.join(dir, 'compiler')}`);
      await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
      await fs.writeFile(path.join(dir, 'compiler', 'index.js'), `const { generateSymbolsAlias } = require('jinge-symbols-base/compiler');\nmodule.exports = { JingeSymbolsAlias: generateSymbolsAlias('${pkg.name}') }`);
      await fs.writeFile(path.join(dir, 'index.js'), `export * from 'jinge-symbols-base';`);
      await fs.writeFile(path.join(dir, 'index.d.ts'), `export * from 'jinge-symbols-base';`);

      if (iconType !== 'outlined' || iconSize !== 24) {
        continue;
      }
      console.log(`  start generating ${iconType}:${iconSize}...`);
      for (let i = 0; i < icons.length; i += 100) {
        await Promise.all(icons.slice(i, i + 100).map(icon => handleIcon(icon, iconType, iconSize)));
      }
      console.log(`  ${iconType}:${iconSize} finished.`);
    }
    console.log(`${iconType} finished.`);
  }
  console.log("all finished");
})().catch((err) => {
  console.error(err);
});
