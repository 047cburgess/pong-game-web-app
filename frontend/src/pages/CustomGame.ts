import Router, { NavError, Page } from "../Router";
import { APP } from "../App";
import {
  AElement,
  Div,
  Paragraph,
  Button,
  Header,
  Image,
  Textbox,
} from "./elements/Elements";
import {
  AVATAR_DIV,
  DEFAULT_BUTTON,
  HOW_TO_CENTER_A_DIV,
  INPUT_BOX_OUTLINE,
  INPUT_BOX_RED_OUTLINE,
} from "./elements/CssUtils";
import { API, UserInfo } from "../Api";

type PlayerSlot = {
  id?: number; // id du joueur si déjà rempli
  name?: string; // nom du joueur
  avatar?: string; // url avatar
  isHost?: boolean;
};

export class WaitingMenu extends Div {
  private PLAYERCONTAINER_CLASS = `relative w-full h-full bg-zinc-700/50 rounded-2xl outline outline-2 outline-gray-400/50 shadow-lg`;

  private header: Header = new Header(2, "Custom Game").class(
    "text-3xl font-bold m-0 mb-6 text-center",
  ) as Header;
  private playerContainer: Div = new Div()
    .withStyle("width:45%; height:45%; ")
    .class(this.PLAYERCONTAINER_CLASS)
    .withId("players-container") as Div;
  private inplayerContainer: AElement[] = [];

  constructor() {
    super();
    this.addContent(
      new Div(this.header, this.playerContainer).class(`
  					flex flex-col justify-center items-center 
  					w-full h-screen
				`),
    );
    //this.class("flex flex-col justify-center items-center min-h-screen p-12");
  }

  updatePlayerContainer(newContents: AElement[]) {
    this.playerContainer.addContent(newContents);
    this.redrawInner();
  }
}

export class InviteMenu extends Div {
  private PLAYERCONTAINER_CLASS = `relative w-full h-full bg-zinc-700/50 rounded-2xl outline outline-2 outline-gray-400/50 shadow-lg`;

  private mockFriends: UserInfo[] = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    username: `Friend${i + 1}`,
    lastSeen: new Date(
      Date.now() - Math.random() * 4 * 60 * 1000,
    ).toISOString(),
  }));

  private friendElements: AElement[] = [];
  private header: Header = new Header(2, "Invite Players").class(
    "text-3xl font-bold m-0 mb-6 text-center",
  ) as Header;

  private textbar: Textbox = new Textbox("friend-search")
    .withStyle(
      `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            width: 95%;
            z-index: 10;
            background-color: rgba(30, 30, 30, 0.9);
        `,
    )
    .class("p-2 mb-4 rounded-lg text-white")
    .class(INPUT_BOX_OUTLINE) as Textbox;

  private friendContainer: Div = new Div()
    .class("flex flex-col overflow-y-auto")
    .withStyle(
      `
            width: 95%;
            margin-top: 60px;
            height: calc(100% - 60px);
        `,
    )
    .withId("customgame-friends-container") as Div;

  private MainContainer: Div = new Div(this.textbar, this.friendContainer)
    .withStyle("width:45%; height:45%; position: relative;")
    .class(this.PLAYERCONTAINER_CLASS)
    .withId("customgame-main-container") as Div;

  constructor() {
    super();
    this.addContent(
      new Div(this.header, this.MainContainer).class(`
                flex flex-col justify-center items-center 
                w-full h-screen
            `),
    );
    this.textbar.withOnkeydown((e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const value = (this.textbar.byId() as HTMLInputElement)?.value;
        if (value) {
          this.onEnterSearch(value);
        }
      }
    });
    this.updatefriendlist();
  }

  async onEnterSearch(value: string) {
    console.log("onentersearch");
    let resp;
    try {
      resp = await fetch(`/api/v1/user/${value}`, { method: "GET" });
      // invite player to game
      console.log("Searched for user:", value);
    } catch (e: any) {
      console.log("Error fetching user");
      return;
    }
    if (!resp.ok) {
      this.textbar.removeClass(INPUT_BOX_OUTLINE);
      this.textbar.class(INPUT_BOX_RED_OUTLINE);
      this.redrawInner();
      console.log("User not found");
      return;
    }
    // search for friends or invite player by name
  }

  updatefriendlist() {
    const friends: UserInfo[] = this.mockFriends;

    const onlineFriends = friends.filter(
      (friend) =>
        !friend.lastSeen
        || Date.now() - new Date(friend.lastSeen).getTime() <= 5 * 60 * 1000,
    );

    const newfriendElements: AElement[] = onlineFriends.map((friend) =>
      new Div(
        new Image(`/api/v1/user/avatars/${friend.username}.webp`)
          .class("rounded-full")
          .withStyle("height: 70%; aspect-ratio: 1/1;"),
        new Paragraph(friend.username)
          .class("text-white text-lg")
          .withStyle(
            "flex-grow: 1; margin-left: 10px; overflow-hidden; text-ellipsis;",
          ),
      )
        .class(
          "flex items-center justify-start p-2 hover:bg-gray-700 rounded-lg mx-auto",
        )
        .withStyle("height: 10%; min-height: 40px; width: 100%;")
        .withOnclick(() => console.log(`Clicked on friend ${friend.username}`)) //placeholder for invite action
        .withId(`friend-${friend.id}`),
    );

    this.friendContainer.removeContent(...this.friendElements);
    this.friendContainer.addContent(newfriendElements);
    this.friendElements = newfriendElements;
    this.redrawInner();
  }
}

export class CustomGamePage extends Page {
  private playerSlots: PlayerSlot[] = Array(4).fill({}); // 4 places
  private currentUserId = APP.userInfo?.id;
  private isHost = false;
  private invitedFriends: { id: number; name: string; avatar: string }[] = [];
  private PlayerCards = new Map<string, PlayerCard>();
  private mainContents: Div = new Div().withId(
    "custompage-main-container",
  ) as Div;

  private Waiting_menu: WaitingMenu = new WaitingMenu();
  private Invite_menu: InviteMenu = new InviteMenu();

  constructor(router: Router, isHost = false) {
    super(router);
    if (!APP.userInfo) throw new NavError(401);
    this.isHost = isHost;
    if (isHost)
      this.playerSlots[0] = {
        id: this.currentUserId,
        name: APP.userInfo?.username,
        avatar: "placeholder_avatar.png",
        isHost: true,
      };
    this.PlayerCards.set(
      "player-0",
      new PlayerCard(APP.userInfo?.username, this.onClick.bind(this))
        .withId("player-0")
        .withStyle("top: 10px; left: 10px; width:45%; height:45%;")
        .class("absolute") as PlayerCard,
    );
    this.PlayerCards.set(
      "player-1",
      new PlayerCard(undefined, this.onClick.bind(this))
        .withId("player-1")
        .withStyle("top: 10px; right: 10px; width:45%; height:45%;")
        .class("absolute") as PlayerCard,
    );
    this.PlayerCards.set(
      "player-2",
      new PlayerCard(undefined, this.onClick.bind(this))
        .withId("player-2")
        .withStyle("bottom: 10px; left: 10px; width:45%; height:45%;")
        .class("absolute") as PlayerCard,
    );
    this.PlayerCards.set(
      "player-3",
      new PlayerCard(undefined, this.onClick.bind(this))
        .withId("player-3")
        .withStyle("bottom: 10px; right: 10px; width:45%; height:45%;")
        .class("absolute") as PlayerCard,
    );
    this.Waiting_menu.updatePlayerContainer(
      Array.from(this.PlayerCards.values()),
    );
    this.mainContents.addContent(this.Waiting_menu);
    this.resetContent();
  }

  resetContent() {
    console.log("resetContent called");
    this.mainContents.removeContent(this.Invite_menu);
    this.mainContents.addContent(this.Waiting_menu);
    //this.Waiting_menu.updatePlayerContainer(Array.from(this.PlayerCards.values()));
    this.PlayerCards.forEach((card) => {
      //disgusting but works
      card.forceMouseLeave();
    });
    this.render();
  }

  render() {
    const el = this.mainContents.byId();
    if (!el) {
      console.log("should not happen");
      return;
    }
    this.mainContents.redrawInner();
  }

  onClick() {
    this.mainContents.removeContent(this.Waiting_menu);
    this.mainContents.addContent(this.Invite_menu);
    this.render();
  }

  content(): AElement[] {
    return [this.mainContents];
  }

  getPlayerCardById(id: string): PlayerCard | undefined {
    return this.PlayerCards.get(id);
  }

  getAllPlayerCards(): PlayerCard[] {
    return Array.from(this.PlayerCards.values());
  }
}

export class PlayerCard extends Div {
  private BACKGROUND_STYLE = `
		w-full h-full 
		bg-gray-800/50
	    outline outline-2 outline-gray-400/50
	`;

  private CONTENT_STYLE = `
    	flex flex-col items-center justify-center
    	rounded-xl
    	p-2
    	gap-1
    	text-center
  	`;
  private _id = Math.random().toString(36).substring(2, 15);
  private waitInterval: any = null;
  private waitingParagraph: Paragraph = new Paragraph("Waiting...")
    .class("text-white font-bold text-xs break-words")
    .withStyle("max-width: 80%;") as Paragraph;
  private overlayPlus: Button = new Button(
    new Div(
      new Paragraph("+")
        .class(
          `text-white text-4xl font-bold absolute inset-0 flex items-center justify-center z-10`,
        )
        .class("flex flex-col items-center gap-2 py-6 px-8 h-full"),
    )
      .class("flex-1 h-40")
      .withId("btn-invite-" + this._id),
  ) as Button;

  private mainContents: Div = new Div()
    .withId("mainContents" + this._id)
    .class(this.BACKGROUND_STYLE)
    .class(this.CONTENT_STYLE) as Div;

  private Waiting_contents: AElement[] = [
    new Div(
      new Image("/api/v1/user/avatars/" + ".webp").class("absolute z-0"),
    ).class(AVATAR_DIV),
    this.waitingParagraph,
  ];

  isfulled: boolean = false;

  constructor(
    playerName: string = "Waiting...",
    private onClick?: () => void,
  ) {
    super();

    this.withId("player-card" + this._id);
    if (playerName === "Waiting...") {
      this.setWaiting();
      this.overlayPlus.renderContents();
    } else {
      this.setPlayer(playerName);
    }
  }

  setPlayer(name: string) {
    this.isfulled = true; // → ce que tu as demandé : set à true
    this.killWaitingDots(); // → tuer l’interval
    this.unbindHoverEffect(); // → retirer le hover
    this.mainContents.addContent([
      new Div(
        new Image("/api/v1/user/avatars/" + name + ".webp").class(
          "absolute z-0",
        ),
      ).class(AVATAR_DIV),
      new Paragraph(name)
        .class("text-white font-bold text-xs")
        .withStyle(`max-width: 80%;`),
    ]);
    this.contents = [this.mainContents];
    this.redrawInner();
  }

  setWaiting() {
    this.animateWaitingDots();
    this.bindHoverEffect();
    this.mainContents.addContent(this.Waiting_contents);
    this.contents = [this.mainContents];
    this.class("grayscale");
  }

  private animateWaitingDots() {
    let count = 0;
    this.waitInterval = setInterval(() => {
      count = (count + 1) % 4;
      const dots = ".".repeat(count);
      this.waitingParagraph.text = `Waiting${dots}`;
      this.mainContents.redrawInner();
    }, 500);
  }

  forceMouseLeave() {
    this.mainContents.removeClass("blur-xs");
    this.removeContent(this.overlayPlus);
    this.redrawInner();
  }

  bindHoverEffect() {
    if (this.isfulled) return;
    setTimeout(() => {
      const el = this.byId();
      if (!el) return;

      this.withOnHover(() => {
        this.mainContents.class("blur-xs");
        this.addContent(this.overlayPlus);
        this.redrawInner();
      });

      this.withOnLeave(() => {
        this.mainContents.removeClass("blur-xs");
        this.removeContent(this.overlayPlus);
        this.redrawInner();
      });

      this.withOnclick(this.onClick ?? (() => {}));
      this.bindEvents();
    });
  }

  private unbindHoverEffect() {
    const el = this.byId();
    if (!el) return;

    el.onmouseenter = null;
    el.onmouseleave = null;
  }

  private killWaitingDots() {
    if (this.waitInterval !== null) {
      clearInterval(this.waitInterval);
      this.waitInterval = null;
    }
  }
}
