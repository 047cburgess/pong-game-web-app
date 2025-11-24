import Router, { Page } from "../Router";
import { HOW_TO_CENTER_A_DIV } from "./elements/CssUtils";
import { AElement, Button, Header, Paragraph } from "./elements/Elements";

export default class NotFoundPage extends Page {
  private backToMain = new Paragraph("Return to main page →")
    .class("mt-8 text-2xl")
    .withId("return-btn");

  private root = new Button(
    new Header(1, "404").class("text-8xl"),
    new Header(2, "Not found :(").class("text-4xl"),
    this.backToMain,
  )
    .class("absolute top-1/2 left-1/2 transform")
    .class("-translate-y-1/2 -translate-x-1/2")
    .class("flex flex-col select-none font-bold")
    .class(HOW_TO_CENTER_A_DIV)
    .withOnclick(() => this.router.navigate(""))
    .withId("root-404");

  constructor(router: Router) {
    super(router);
  }

  content(): AElement[] {
    return [this.root];
  }

  bindEvents(): void {
    this.root.bindEvents();
  }
}
