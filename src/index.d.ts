import { RenderFn } from "jinge";
import { Attributes } from "jinge";
import { Component } from "jinge";

export declare class Icon extends Component {}
export declare type IconState = 'normal' | 'hover' | 'active' | 'activeHover';
export declare const ICON_SET: unique symbol;

export declare class IconSet extends Component {
  constructor(attrs: Attributes<{
    [ICON_SET]: Record<string, RenderFn>,
    state: string;
  }>);
}
