import Router, { Page } from "../Router";
import {
  AElement,
  Div,
  Paragraph,
  Button,
  Header,
  AContainer,
} from "./elements/Elements";
import { DEFAULT_BUTTON } from "./elements/CssUtils";
import { stringify } from "querystring";
import { APP, createCustomGame } from "../App";
import { gameKeys } from "./CustomGame";

type MenuState = "main" | "local" | "online";

export default class PlayPage extends Page {
  private menuState: MenuState = "main";
  private menuContainer: Div = new Div();
  private onlinemenu: Online_Menu;

  constructor(router: Router) {
    super(router);
    this.onlinemenu = new Online_Menu(router, this.OnlineClickBack.bind(this));
  }

  content(): AElement[] {
    this.menuContainer = new Div(this.renderMainMenu())
      .withId("play-menu-container")
      .class("flex flex-col gap-4") as Div;

    return [
      new Div(this.menuContainer).class(
        "flex flex-col justify-center items-center min-h-screen p-12",
      ),
    ];
  }

  bindEvents(): void {
    this.menuContainer.bindEvents();
  }

  private renderMenu(): void {
    const container = this.menuContainer.byId();
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

    this.menuContainer.contents[0] = menuContent;
    this.menuContainer.redrawInner();
  }

  private renderMainMenu(): AElement {
    return new Div(
      new Paragraph("Choose your game mode").class(
        "text-2xl text-neutral-400 mb-6 text-center",
      ),

      new Div(
        // Play local button
        new Button(
          new Div(
            new Header(2, "Local").class("text-2xl font-bold m-0"),
            new Paragraph("Play on the same keyboard").class(
              "text-neutral-400",
            ),
          ).class("flex flex-col items-center gap-2 py-6 px-8 h-full"),
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
            new Paragraph("Play online with friends").class("text-neutral-400"),
          ).class("flex flex-col items-center gap-2 py-6 px-8 h-full"),
        )
          .class(DEFAULT_BUTTON)
          .class("flex-1 h-40")
          .withId("btn-online")
          .withOnclick(() => {
            this.menuState = "online";
            this.renderMenu();
          }),
      ).class("flex flex-row gap-4 w-full max-w-4xl"),
    ).class("flex flex-col gap-4 w-full max-w-4xl");
  }

  private renderLocalMenu(): AElement {
    return new Div(
      // Custom game 2-4 players
      new Button(
        new Div(
          new Header(2, "Classic Game").class("text-xl font-bold"),
          new Paragraph("2-4 players").class("text-neutral-400 text-sm"),
        ).class("flex flex-col items-center gap-2 py-4 px-8"),
      )
        .class(DEFAULT_BUTTON)
        .class("w-full max-w-md")
        .withId("btn-local-custom")
        .withOnclick(() => {
          this.router.navigate("/games/local");
        }),

      // 4 player tournament
      new Button(
        new Div(
          new Header(2, "4-Player Tournament").class("text-xl font-bold"),
          new Paragraph("Compete at the same keyboard").class(
            "text-neutral-400 text-sm",
          ),
        ).class("flex flex-col items-center gap-2 py-4 px-8"),
      )
        .class(DEFAULT_BUTTON)
        .class("w-full max-w-md")
        .withId("btn-local-tournament")
        .withOnclick(() => {
          this.router.navigate("/games/tournament/local");
        }),

      // Back button
      new Button(new Paragraph("Back").class("py-3 px-8"))
        .class(DEFAULT_BUTTON)
        .class("w-full max-w-md mt-4 opacity-70 hover:opacity-100")
        .withId("btn-back-local")
        .withOnclick(() => {
          this.menuState = "main";
          this.renderMenu();
        }),
    ).class("flex flex-col gap-4 w-full max-w-2xl");
  }
  private renderOnlineMenu(): AElement {
    return this.onlinemenu;
  }

  private OnlineClickBack() {
    this.menuState = "main";
    this.renderMenu();
  }
}

export class Online_Menu extends Div {
  private QuickMatchButton: Button = new Button(
    new Div(
      new Header(2, "Quick Match").class("text-xl font-bold"),
      new Paragraph("1v1 Random opponent").class("text-neutral-400 text-sm"),
    ).class("flex flex-col items-center gap-2 py-4 px-8"),
  )
    .class(DEFAULT_BUTTON)
    .class("w-full max-w-md")
    .withId("btn-online-quick")
    .withOnclick(() => {
      this.router.navigate("/queue");
    }) as Button;

  private CustomGameButton: Button = new Button(
    new Div(
      new Header(2, "Custom Game").class("text-xl font-bold"),
      new Paragraph("2-4 players, invite friends").class(
        "text-neutral-400 text-sm",
      ),
    ).class("flex flex-col items-center gap-2 py-4 px-8"),
  )
    .class(DEFAULT_BUTTON)
    .class("w-full max-w-md")
    .withId("btn-online-custom")
    .withOnclick(this.OnClickCustom.bind(this)) as Button;

  private custom_selection_buttons: AElement[];
  private customGameDiv = new Div()
    .withId("Play-OnlineMenu-customgamebutton-div")
    .class("flex flex-row gap-4 w-full justify-center max-w-md") as Div;

  private Online_TournamentBTn = new Button(
    new Div(
      new Header(2, "Tournament").class("text-xl font-bold"),
      new Paragraph("Create a 4pl tournament").class(
        "text-neutral-400 text-sm",
      ),
    ).class("flex flex-col items-center gap-2 py-4 px-8"),
  )
    .class(DEFAULT_BUTTON)
    .class("w-full max-w-md")
    .withId("btn-online-tournament")
    .withOnclick(() => {
      this.router.navigate("/tournaments/create");
    }) as Button;

  private Back_button = new Button(new Paragraph("Back").class("py-3 px-8"))
    .class(DEFAULT_BUTTON)
    .class("w-full max-w-md mt-4 opacity-70 hover:opacity-100")
    .withId("btn-back-online") as Button;
  private mainDiv = new Div()
    .class("flex flex-col gap-4 w-full max-w-2xl")
    .withId("Play-OnlineMenu-main-div") as Div;

  constructor(
    private router: Router,
    private backmethod: () => any,
  ) {
    super();
    this.Back_button = this.Back_button.withOnclick(this.backmethod) as Button;

    this.custom_selection_buttons = [2, 3, 4].map((i) =>
      new Button(new Paragraph(`${i}j`).class("w-full text-center"))
        .class(DEFAULT_BUTTON)
        .withOnclick(() => this.createCustom(i))
        .class("w-full py-4"),
    );

    this.mainDiv.addContentWithAppend([
      this.QuickMatchButton,
      this.customGameDiv,
      this.Online_TournamentBTn,
      this.Back_button,
    ]);
    this.customGameDiv.addContentWithAppend(this.CustomGameButton);
    this.contents = [this.mainDiv];
  }

  OnclickBack() {
    this.resetCustom();
    this.backmethod();
  }

  OnClickCustom() {
    this.customGameDiv.UnAppendContent(this.CustomGameButton);
    this.customGameDiv.addContentWithAppend(this.custom_selection_buttons);
    this.customGameDiv.bindEvents();
  }

  resetCustom() {
    this.customGameDiv.addContentWithAppend(this.CustomGameButton);
    this.custom_selection_buttons.forEach((b) =>
      this.customGameDiv.UnAppendContent(b),
    );
    this.customGameDiv.bindEvents();
  }

  createCustom(i: number) {
    this.resetCustom();
    createCustomGame(i);
  }
}
