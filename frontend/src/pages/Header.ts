import { SelfInfo } from "../Api";
import Router, { Page } from "../Router";
import { HOW_TO_CENTER_A_DIV } from "./elements/CssUtils";
import { AElement, Button, Div, Image, Paragraph } from "./elements/Elements";
import { ICON_QUIT } from "./elements/SvgIcons";

const makeButton = (
  text: string,
  id: string,
  link: string,
): { elem: AElement; link: string } => {
  return {
    elem: new Button(new Paragraph(text).class("self-center p-2 -m-2")).withId(
      id,
    ),
    link,
  };
};

export default class PageHeader extends Page {
  title = new Button(
    new Paragraph("libft_transcendence").class("self-center text-2xl"),
  )
    .withOnclick(() => this.router.navigate(""))
    .withId("header-title");
  buttons: { elem: AElement; link: string }[];
  userInfo: SelfInfo | null;
  navButtons: AElement[];

  constructor(router: Router, userInfo: SelfInfo | null) {
    super(router, false);
    this.userInfo = userInfo;
    this.buttons = [
      makeButton("Register", "header-nav-register", "register"),
      makeButton("Log in", "header-nav-login", "login"),
      makeButton("Play", "header-nav-play", "play"),
      makeButton("Friends", "header-nav-friends", "friends"),
      makeButton(userInfo?.username ?? "", "header-nav-self", "dashboard"),
      {
        elem: new Div(
          new Image("/api/v1/user/avatars/" + userInfo?.username + ".webp"),
        )
          .class(
            "aspect-square bg-zinc-700/25 h-10 rounded-full self-center overflow-hidden flex",
          )
          .class(HOW_TO_CENTER_A_DIV)
          .withId("header-nav-self-img"),
        link: "dashboard",
      },
      makeButton(ICON_QUIT, "header-nav-logout", "logout"),
    ];

    if (this.userInfo) {
      this.navButtons = this.buttons.slice(2).map((e) => e.elem);
    } else {
      this.navButtons = this.buttons.slice(0, 2).map((e) => e.elem);
    }
  }

  content(): AElement[] {
    return [
      new Div(
        this.title,
        new Div(...this.navButtons).class("flex flex-rot gap-4"),
      )
        .class("flex flex-rot justify-between")
        .class("h-full w-screen p-4 pl-12 pr-12 select-none font-bold")
        .withId("page-header-div"),
    ];
  }

  bindEvents() {
    this.title.bindEvents();
    this.buttons.forEach((e) => {
      e.elem.byId()?.addEventListener("click", () => {
        this.router.navigate(e.link);
      });
    });
  }
}
