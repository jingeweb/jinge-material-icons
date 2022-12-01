import { Component } from "jinge";
import _tpl from './icon_set.html';
import './icon.css';

export const ICON_SET = Symbol();
export class IconSet extends Component {
  static template = _tpl;
  constructor(attrs) {
    super(attrs);
    this[ICON_SET] = attrs[ICON_SET];
    this.st = attrs.state;
  }
  get st() {
    return this._st;
  }
  set st(v) {
    v = v || 'normal';
    if (this._st === v) return;
    this._st = v;
    this.ic = this[ICON_SET][this._st];
  }
  __afterRender() {
    this.__domPassListeners();
  }
}
