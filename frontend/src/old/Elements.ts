import { FieldValidator } from "../../FieldValidators";
import { INPUT_BOX_OUTLINE, INPUT_BOX_RED_OUTLINE } from "./CssUtils";

export abstract class AElement {
  id?: string;
  classes: string[] = [];
  private onclick?: (this: GlobalEventHandlers, e: PointerEvent) => any;
  private inlineStyle?: string;

  abstract render(): string;

  withId(c: string): AElement {
    this.id = c;
    return this;
  }

  class(c: string | Iterable<string> = ""): AElement {
    if (typeof c === 'string') {
      this.classes.push(c);
    } else {
      for (const x of c) {
        this.classes.push(x);
      }
    }
    return this;
  }

  withOnclick(
    onclick: (this: GlobalEventHandlers, e: PointerEvent) => any
  ): AElement {
    this.onclick = onclick;
    return this;
  }

  withStyle(style: string): AElement {
    this.inlineStyle = style;
    return this;
  }

  protected genTags(): string {
    let res = "";
    if (this.id) {
      res += `id="${this.id}" `;
    }
    if (this.classes.length) {
      res += `class="${this.classes.join(" ")}" `;
    }
    if (this.inlineStyle) {
      res += `style="${this.inlineStyle}" `;
    }
    return res;
  }

  byId(): HTMLElement | null {
    if (this.id) {
      return document.getElementById(this.id);
    }
    return null;
  }

  redraw(): void {
    const self = this.byId();
    if (!self) {
      return;
    }
    self.outerHTML = this.render();
  }

  bindEvents(): void {
    const self = this.byId();
    if (!self) return;
    self.onclick = this.onclick ?? null;
  }
}

export class Paragraph extends AElement {
  text: string = "";

  constructor(text: string) {
    super();
    this.text = text;
  }

  render(): string {
    return `<p ${this.genTags()}>${this.text}</p>`;
  }
};

export class Label extends AElement {
  text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  render(): string {
    return `<label ${this.genTags()}>${this.text}</label>`;
  }
};

export class Textbox extends AElement {
  private _password: boolean = false;
  private onkeydown?: (this: GlobalEventHandlers, e: KeyboardEvent) => any;
  private postVal?: (e: Textbox) => any;
  validators: FieldValidator[] = [];
  validationErrors: string[] | undefined;

  constructor(id: string) {
    super();
    this.id = id;
  }

  password(): Textbox {
    this._password = true;
    return this;
  }

  render(): string {
    const t = this._password ? "password" : "text";
    return `<input type="${t}" ${this.genTags()}/>`;
  }

  runValidators() {
    const self = this.byId() as null | HTMLInputElement;
    if (!self) return;
    let errors: undefined | string[];
    for (const v of this.validators) {
      const res = v(self.value);
      if (res === null) {
        continue;
      }
      errors = errors ?? [];
      errors.push(...res);
    }
    if (errors !== undefined) {
      self.classList.remove(...INPUT_BOX_OUTLINE);
      self.classList.add(...INPUT_BOX_RED_OUTLINE);
    } else {
      self.classList.remove(...INPUT_BOX_RED_OUTLINE);
      self.classList.add(...INPUT_BOX_OUTLINE);
    }
    this.validationErrors = errors;
    this.postVal?.call(null, this);
  }

  bindEvents(): void {
    super.bindEvents();
    const self = this.byId() as null | HTMLInputElement;
    if (!self) return;
    self.onkeyup = this.runValidators.bind(this);
    self.onkeydown = this.onkeydown ?? null;
  }

  withOnkeydown(
    onkeydown: (this: GlobalEventHandlers, e: KeyboardEvent) => any
  ): Textbox {
    this.onkeydown = onkeydown;
    return this;
  }

  withValidator(v: FieldValidator): Textbox {
    this.validators.push(v);
    return this;
  }

  postValidation(cb: null | ((e: Textbox) => any)): Textbox {
    if (cb) this.postVal = cb;
    else delete this.postVal;
    return this;
  }
};

export class Header extends AElement {
  level: number;
  text: string;

  constructor(level: number, text: string) {
    super();
    this.level = level;
    this.text = text;
  }

  render(): string {
    return `<h${this.level} ${this.genTags()}>${this.text}</h${this.level}>`;
  }
};

export class Inline extends AElement {
  value: string;

  constructor(value: string = "") {
    super();
    this.value = value;
  }

  render(): string {
    return this.value;
  }

  class(_?: string | Iterable<string>): AElement {
    return this;
  }
};

export class Image extends AElement {
  src: string;

  constructor(src: string) {
    super();

    this.src = src;
  }

  render(): string {
    return `<img class="object-fill max-h-full drop-shadow-md rounded-md m-auto" src="${this.src}" ${this.genTags()}/>`;
  }
};

export abstract class AContainer extends AElement {
  contents: AElement[] = [];

  constructor(...contents: AElement[]) {
    super();
    this.contents = contents;
  }

  renderContents(): string {
    return this.contents.map(e => e.render()).join("");
  }

  bindEvents(): void {
    super.bindEvents();
    this.contents.forEach(e => e.bindEvents());
  }

  redrawInner(): void {
    const self = this.byId();
    if (!self) return;
    self.innerHTML = this.renderContents();
    this.bindEvents();
  }
}

export class Div extends AContainer {
  constructor(...contents: AElement[]) {
    super(...contents);
  }

  render(): string {
    return `<div ${this.genTags()}>${this.renderContents()}</div>`;
  }
}

export class Button extends AContainer {
  constructor(...contents: AElement[]) {
    super(...contents);
  }

  render(): string {
    return `<button ${this.genTags()}>${this.renderContents()}</button>`;
  }
};
