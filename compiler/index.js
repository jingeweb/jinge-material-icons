const icons = require('./icons');
function generateSymbolsAlias(libname) {
  return Object.fromEntries(icons.map(icon => [`${libname}/${icon}.js`, {
      [`Ic_${icon}`]: `md-ic-${icon}`,
      [`Ics_${icon}`]: `md-ics-${icon}`,
    }
  ]));
}
module.exports = {
  generateSymbolsAlias
};
