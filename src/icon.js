import { Component } from 'jinge';
import _tpl from './icon.html';
import './icon.css';


export class Icon extends Component {
  static template = _tpl;

  __afterRender() {
    this.__domPassListeners();
  }
}
