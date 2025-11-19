import { APP } from "../App";
import Router, { NavError, Page } from "../Router";
import { AElement, Div, Paragraph, Button, Header } from "./elements/Elements";
import { DEFAULT_BUTTON, HOW_TO_CENTER_A_DIV } from "./elements/CssUtils";

type MenuState = "main" | "local" | "online";

export default class PlayPage extends Page {
  private menuState: MenuState = "main";
  private menuContainerId = "play-menu-container";

  constructor(router: Router) {
    super(router);
    if (!APP.userInfo) {
      throw new NavError(401);
    }
  }

  content(): AElement[] {
    return [
      new Div(
        new Div().withId(this.menuContainerId).class("flex flex-col gap-4")
      )
        .class("flex flex-col justify-center items-center min-h-screen p-12")
    ];
  }

  bindEvents(): void {
    this.renderMenu();
  }

  private renderMenu(): void {
    const container = document.getElementById(this.menuContainerId);
    if (!container) return;

    let menuContent: AElement;

    switch (this.menuState) {
      case "main":
        menuContent = this.renderMainMenu();
        break;
      case "local":
        menuContent = this.renderLocalMenu();
        break;
      case "online":
        menuContent = this.renderOnlineMenu();
        break;
    }

    container.innerHTML = menuContent.render();
    menuContent.bindEvents();
  }

  private renderMainMenu(): AElement {
    return new Div(
      new Paragraph("Choose your game mode")
        .class("text-2xl text-neutral-400 mb-6 text-center"),

      new Div(
	// Play local button
        new Button(
          new Div(
            new Header(2, "Local").class("text-2xl font-bold m-0"),
            new Paragraph("Play on the same keyboard").class("text-neutral-400")
          ).class("flex flex-col items-center gap-2 py-6 px-8 h-full")
        )
          .class(DEFAULT_BUTTON)
          .class("flex-1 h-40")
          .withId("btn-local")
          .withOnclick(() => {
            this.menuState = "local";
            this.renderMenu();
          }),

        // Play online button
        new Button(
          new Div(
            new Header(2, "Online").class("text-2xl font-bold m-0"),
            new Paragraph("Play online with friends").class("text-neutral-400")
          ).class("flex flex-col items-center gap-2 py-6 px-8 h-full")
        )
          .class(DEFAULT_BUTTON)
          .class("flex-1 h-40")
          .withId("btn-online")
          .withOnclick(() => {
            this.menuState = "online";
            this.renderMenu();
          })
      ).class("flex flex-row gap-4 w-full max-w-4xl")
    ).class("flex flex-col gap-4 w-full max-w-4xl");
  }

  private renderLocalMenu(): AElement {
    return new Div(
      // Custom game 2-4 players
      new Button(
        new Div(
          new Header(2, "Classic Game").class("text-xl font-bold"),
          new Paragraph("2-4 players").class("text-neutral-400 text-sm")
        ).class("flex flex-col items-center gap-2 py-4 px-8")
      )
        .class(DEFAULT_BUTTON)
        .class("w-full max-w-md")
        .withId("btn-local-custom")
        .withOnclick(() => {
          this.router.navigate("/.......");
        }),

      // 4 player tournament
      new Button(
        new Div(
          new Header(2, "4-Player Tournament").class("text-xl font-bold"),
          new Paragraph("Compete at the same keyboard").class("text-neutral-400 text-sm")
        ).class("flex flex-col items-center gap-2 py-4 px-8")
      )
        .class(DEFAULT_BUTTON)
        .class("w-full max-w-md")
        .withId("btn-local-tournament")
        .withOnclick(() => {
          this.router.navigate("/sfsdfsd"); // placeholder
        }),

      // Back button
      new Button(
        new Paragraph("Back").class("py-3 px-8")
      )
        .class(DEFAULT_BUTTON)
        .class("w-full max-w-md mt-4 opacity-70 hover:opacity-100")
        .withId("btn-back-local")
        .withOnclick(() => {
          this.menuState = "main";
          this.renderMenu();
        })
    ).class("flex flex-col gap-4 w-full max-w-2xl");
  }

  private renderOnlineMenu(): AElement {
    return new Div(

      // Quick random 2 player
      new Button(
        new Div(
          new Header(2, "Quick Match").class("text-xl font-bold"),
          new Paragraph("1v1 Random opponent").class("text-neutral-400 text-sm")
        ).class("flex flex-col items-center gap-2 py-4 px-8")
      )
        .class(DEFAULT_BUTTON)
        .class("w-full max-w-md")
        .withId("btn-online-quick")
        .withOnclick(() => {
          this.router.navigate("/queue/join");
        }),

      // Custom game
      new Button(
        new Div(
          new Header(2, "Custom Game").class("text-xl font-bold"),
          new Paragraph("2-4 players, invite friends").class("text-neutral-400 text-sm")
        ).class("flex flex-col items-center gap-2 py-4 px-8")
      )
        .class(DEFAULT_BUTTON)
        .class("w-full max-w-md")
        .withId("btn-online-custom")
        .withOnclick(() => {
          this.router.navigate("/games/create");
        }),

      // Online tournament
      new Button(
        new Div(
          new Header(2, "Tournament").class("text-xl font-bold"),
          new Paragraph("Create a 4pl tournament").class("text-neutral-400 text-sm")
        ).class("flex flex-col items-center gap-2 py-4 px-8")
      )
        .class(DEFAULT_BUTTON)
        .class("w-full max-w-md")
        .withId("btn-online-tournament")
        .withOnclick(() => {
          this.router.navigate("/tournaments/create");
        }),

      // Back button
      new Button(
        new Paragraph("Back").class("py-3 px-8")
      )
        .class(DEFAULT_BUTTON)
        .class("w-full max-w-md mt-4 opacity-70 hover:opacity-100")
        .withId("btn-back-online")
        .withOnclick(() => {
          this.menuState = "main";
          this.renderMenu();
        })
    ).class("flex flex-col gap-4 w-full max-w-2xl");
  }
}
