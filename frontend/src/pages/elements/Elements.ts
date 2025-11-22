import { FieldValidator } from "../../FieldValidators";
import { INPUT_BOX_OUTLINE, INPUT_BOX_RED_OUTLINE } from "./CssUtils";

export abstract class AElement {
  id?: string;
  classes: Set<string> = new Set();
  private onclick?: (this: GlobalEventHandlers, e: PointerEvent) => any;
  private onmouseover?: (this: GlobalEventHandlers, e: MouseEvent) => any;
  private onmouseleave?: (this: GlobalEventHandlers, e: MouseEvent) => any;
  private onmouseenter?: (this: GlobalEventHandlers, e: MouseEvent) => any;
  private inlineStyle?: string;

  abstract render(): string;

  withId(c: string): AElement {
    this.id = c;
    return this;
  }

  class(c: string | Iterable<string> = ""): AElement {
    if (typeof c === "string") {
      c.split(/\s+/).forEach((c) => {
        if (c.trim()) this.classes.add(c);
      });
    } else {
      for (const x of c) {
        this.class(x);
      }
    }
    return this;
  }

  removeClass(c: string | Iterable<string> = ""): AElement {
    if (typeof c === "string") {
      c.split(/\s+/).forEach((c) => this.classes.delete(c));
    } else {
      for (const x of c) {
        this.removeClass(x);
      }
    }
    return this;
  }

  update_classes(): void {
    const el = this.byId();
    if (!el) return;

    this.classes.forEach((cls) => {
      if (cls.trim()) el.classList.add(cls); // ignore les vides
    });

    Array.from(el.classList).forEach((cls) => {
      if (!this.classes.has(cls)) el.classList.remove(cls);
    });
  }

  withOnclick(
    onclick: (this: GlobalEventHandlers, e: PointerEvent) => any,
  ): AElement {
    this.onclick = onclick;
    return this;
  }

  withOnHover(
    onhover: (this: GlobalEventHandlers, e: MouseEvent) => any,
  ): AElement {
    this.onmouseover = onhover;
    return this;
  }

  withOnEnter(
    onenter: (this: GlobalEventHandlers, e: MouseEvent) => any,
  ): AElement {
    this.onmouseenter = onenter;
    return this;
  }

  withOnLeave(
    onleave: (this: GlobalEventHandlers, e: MouseEvent) => any,
  ): AElement {
    this.onmouseleave = onleave;
    return this;
  }

  withStyle(style: string): AElement {
    this.inlineStyle = style;
    return this;
  }

  protected genTags(): string {
    let res: string[] = [];
    if (this.id) {
      res.push(`id="${this.id}"`);
    }
    let classes = [];
    for (const c of this.classes.keys()) {
      classes.push(c);
    }
    if (classes) {
      res.push(`class="${classes.join(" ")}"`);
    }
    if (this.inlineStyle) {
      res.push(`style="${this.inlineStyle}"`);
    }
    return res.join(" ");
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
    self.onmouseover = this.onmouseover ?? null;
    self.onmouseleave = this.onmouseleave ?? null;
    self.onmouseenter = this.onmouseenter ?? null;
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

  set_TextContent(text: string) {
    this.text = text;
    const el = this.byId() as HTMLParagraphElement;
    if (!el) return;
    el.textContent = text;
  }
}

export class Label extends AElement {
  text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  render(): string {
    return `<label ${this.genTags()}>${this.text}</label>`;
  }
}

export class Textbox extends AElement {
  private _password: boolean = false;
  private onkeydown?: (this: GlobalEventHandlers, e: KeyboardEvent) => any;
  private postVal?: (e: Textbox) => any;
  validators: FieldValidator[] = [];
  validationErrors: string[] | null = null;

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
    this.validationErrors = errors ?? null;
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
    onkeydown: (this: GlobalEventHandlers, e: KeyboardEvent) => any,
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
}

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
}

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
}

export class Image extends AElement {
  src: string;

  constructor(src: string) {
    super();

    this.src = src;
  }

  render(): string {
    return `<img class="object-cover h-full drop-shadow-md rounded-md m-auto" src="${this.src}?_=shit${Date.now()}" ${this.genTags()}/>`;
  }
}

export abstract class AContainer extends AElement {
  contents: AElement[] = [];
  child_count: number = 0;

  constructor(...contents: AElement[]) {
    super();
    this.contents = contents;
  }

  replaceContent(
    oldElement: AElement,
    newElement: AElement,
    insert: boolean = false,
  ): AContainer {
    const index = this.contents.findIndex((c) => c === oldElement);
    if (index !== -1) {
      this.contents[index] = newElement;
    } else {
      if (insert) return this;
      this.contents.push(newElement);
    }
    return this;
  }

  removeContent(...contents: AElement[]): AContainer {
    this.contents = this.contents.filter((c) => !contents.includes(c));
    return this;
  }

  addContentWithAppend(contents: AElement | Iterable<AElement>): AContainer {
    if (!(Symbol.iterator in Object(contents))) {
      this._addOrUpdate(contents as AElement);
      this.AppendContent(contents as AElement);
    } else {
      for (const x of contents as Iterable<AElement>) {
        this._addOrUpdate(x);
        this.AppendContent(x);
      }
    }
    return this;
  }

  private AppendContent(content: AElement) {
    const self = this.byId();
    if (!self) return;

    if (!content.id) content.withId(`child_${this.child_count++}_${this.id}`);
    const template = document.createElement("template");
    template.innerHTML = content.render().trim();

    self.appendChild(template.content);
  }

  UnAppendContent(content: AElement) {
    this.removeContent(content);
    const self = this.byId();
    const child = content.byId();
    if (!self || !child) return;
    self.removeChild(child);
  }

  addContent(contents: AElement | Iterable<AElement>): AContainer {
    if (!(Symbol.iterator in Object(contents))) {
      this._addOrUpdate(contents as AElement);
    } else {
      for (const x of contents as Iterable<AElement>) {
        this._addOrUpdate(x);
      }
    }
    return this;
  }

  private _addOrUpdate(element: AElement) {
    const index = this.contents.findIndex((c) => c === element);
    if (index === -1) this.contents.push(element);
  }

  renderContents(): string {
    return this.contents.map((e) => e.render()).join("");
  }

  bindEvents(): void {
    super.bindEvents();
    this.contents.forEach((e) => e.bindEvents());
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
}
