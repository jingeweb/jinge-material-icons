import { Component, isNumber, isString, __ } from 'jinge';
import _tpl from './_icon.html';

const NUM_REGEXP = /^\d+$/;

function _size(v) {
  if (isNumber(v) || (isString(v) && NUM_REGEXP.test(v))) {
    return v + 'px';
  } else {
    return v;
  }
}
function _style(attrs) {
  let sty = attrs.style || '';
  if (attrs.size) {
    if (sty && !sty.endsWith(';')) {
      sty += ';';
    }
    sty += `font-size:${_size(attrs.size)};`;
  }
  return sty;
}

export const svgTagAttrs = {
  xmlns: `http://www.w3.org/2000/svg`,
  height: `24`,
  viewBox: `0 0 24 24`,
  width: `24`
};

export class BaseIcon extends Component {
  static template = _tpl;

  constructor(attrs) {
    super(attrs);
    this.className = attrs.class;
    this.style = attrs.style || attrs.size ? _style(attrs) : null;
  }
  __afterRender() {
    this.__domPassListeners();
  }
}
