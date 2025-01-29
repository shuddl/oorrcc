import { JSX as JSXType } from 'react';

declare global {
  namespace JSX {
    interface Element extends JSXType.Element {}
    interface ElementClass extends JSXType.ElementClass {}
    interface ElementAttributesProperty extends JSXType.ElementAttributesProperty {}
    interface ElementChildrenAttribute extends JSXType.ElementChildrenAttribute {}
    interface IntrinsicAttributes extends JSXType.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T> extends JSXType.IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends JSXType.IntrinsicElements {}
  }
}

export {};