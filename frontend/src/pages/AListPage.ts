import { APP } from "../App";
import Router, { Page } from "../Router";
import { HOW_TO_CENTER_A_DIV, MUTED_TEXT } from "./elements/CssUtils";
import { AElement, Div, Paragraph } from "./elements/Elements";

export const titleForUser =
  (baseTitle: string, user: string) =>
  (page: AListPage): Paragraph => {
    let isCurrent = false;
    if (user === APP.userInfo?.username) {
      isCurrent = true;
    }

    let title = new Paragraph(baseTitle);
    if (!isCurrent) {
      if (baseTitle.length) {
        baseTitle = baseTitle[0].toLowerCase() + baseTitle.slice(1);
      }
      title.text = `${user}'s ${baseTitle}`;
      title.withOnclick(() =>
        page.router.navigate("/dashboard" + location.search),
      );
      title.class("select-none");
    }

    title
      .class("text-4xl font-bold text-left mr-auto mb-6")
      .withId(page.listType + "-title");

    return title;
  };

export default abstract class AListPage extends Page {
  listType: string;

  title: Paragraph;
  listDiv: Div;

  constructor(
    router: Router,
    listType: string,
    title: (p: AListPage) => Paragraph,
  ) {
    super(router);
    this.listType = listType;

    this.title = title(this);

    this.listDiv = new Div(
      new Paragraph("Loading...").class(MUTED_TEXT).class("text-xl"),
    )
      .class("flex flex-col")
      .class(HOW_TO_CENTER_A_DIV)
      .withId(listType + "-div") as Div;
  }

  content(): AElement[] {
    return [
      new Div(this.title, this.listDiv)
        .class("flex flex-col p-16 min-w-140 max-w-200 ml-auto mr-auto gap-8")
        .class(HOW_TO_CENTER_A_DIV),
    ];
  }

  bindEvents(): void {
    this.title.bindEvents();
    this.listDiv.bindEvents();
  }

  setContents(elems: AElement[]) {
    this.listDiv.contents = elems;
  }

  redrawList() {
    this.listDiv.redrawInner();
  }
}
