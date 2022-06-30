const { promises: fs } = require('fs');
const path = require('path');
const svgo = require('svgo');
const { TemplateParser, ComponentParser } = require('jinge-compiler');
const { execSync } = require('child_process');

TemplateParser.aliasManager.initialize();

const SVG_DIR = path.resolve(__dirname, '../svg');
const LIB_DIR = path.resolve(__dirname, '../lib');
const SRC_DIR = path.resolve(__dirname, '../src');
execSync(`rm -rf ${LIB_DIR} && mkdir ${LIB_DIR}`);

const SVG_TYPES = ['', 'outlined', 'round', 'sharp', 'twotone'];
const SVG_POSTFIX = SVG_TYPES.map((t) => t.replace(/^./, m => m.toUpperCase()));

async function handleCategary(categary, aliasJson) {
  const dir = path.join(SVG_DIR, categary);

  const st = await fs.stat(dir);
  if (!st.isDirectory()) return;
  const files = await fs.readdir(dir);
  for await(const file of files) {
    const name = file.replace(/_[\w\d]/g, (m) => m[1].toUpperCase()).replace(/^\w/, m => m.toUpperCase());
    for await(const [index, type] of SVG_TYPES.entries()) {
      const filename = `${categary}/${file}/materialicons${type}/24px.svg`;
      const filepath = path.join(dir, file, `materialicons${type}`, '24px.svg');
      try {
        await fs.access(filepath);
      } catch(ex) {
        console.error(`[warning] ${filename} not found.`);
        continue;
      }
      const filecnt = await fs.readFile(filepath);
      const svg = svgo.optimize(filecnt, {
        plugins: [ 'removeTitle', {
          name: 'removeUselessStrokeAndFill',
          params: {
            removeNone: true,
            removeUseless: true,
          }
        }, 'collapseGroups' ]
      });
      if (svg.error) {
        console.error(`[error] ${filename} svgo error:`, svg.error);
        continue;
      }
      const result = await TemplateParser.parse(svg.data.replace(/<g\/>/g, ''), {
        resourcePath: filepath,
        emitErrorFn: (err) => console.error(err),
      });
      let iconName = `${name}${SVG_POSTFIX[index]}`;
      const code = `import { __ } from 'jinge'; import { BaseIcon, svgTagAttrs } from './_icon.js';\n` + result.code.replace('export default', 'const _svg =').replace(/"svg",\s+\{[^}]+\}/, '"svg", svgTagAttrs') + `\nexport default class extends BaseIcon {
  constructor(attrs) {
    attrs[__].slots = { default: _svg };
    super(attrs);
  }
}`
     
      await fs.writeFile(path.join(LIB_DIR, `${iconName}.js`), code);
      aliasJson.push(`'jinge-material-icons/lib/${iconName}.js': { 'default' : 'md-icon-${file}${type ? '-' + type : ''}' }`);
    }
  }
  console.log(`  ${categary} finished.`);
}
(async () => {
  const categaries = await fs.readdir(SVG_DIR);
  console.log('start generating...');
  execSync(`cp ${SRC_DIR}/_icon.css ${LIB_DIR}`);

  let cnt = await fs.readFile(path.join(SRC_DIR, '_icon.js'), 'utf-8');
  let result = await ComponentParser.parse(cnt, undefined, {
    resourcePath: '_icon.js'
  });
  await fs.writeFile(path.join(LIB_DIR, '_icon.js'), result.code.replace(`'./_icon.html'`, `'./_icon.tpl.js'`));

  cnt = await fs.readFile(path.join(SRC_DIR, '_icon.html'), 'utf-8');
  result = await TemplateParser.parse(cnt, { resourcePath: '_icon.html' });
  await fs.writeFile(path.join(LIB_DIR, '_icon.tpl.js'), result.code);

  const aliasJson = [];
  for await(const categary of categaries) {
    await handleCategary(categary, aliasJson);
  }

  await fs.writeFile(path.resolve(__dirname, '../compiler/_auto_generated_icons_alias.js'), `/* This file is auto genreated by script, never change it manually. */
module.exports = {
${aliasJson.join(',\n')}
}`)
  console.log('generate finished');
})().catch((err) => {
  console.error(err);
});
