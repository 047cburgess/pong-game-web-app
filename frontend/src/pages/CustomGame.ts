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
  DEFEAT_COLOR,
  DRAW_COLOR,
  HOW_TO_CENTER_A_DIV,
  INPUT_BOX_OUTLINE,
  INPUT_BOX_RED_OUTLINE,
  PLAYER_COLOURS,
  TIMER_COUNTDOWN,
  TIMER_NORMAL,
  VICTORY_COLOR,
} from "./elements/CssUtils";
import { API, UserInfo } from "../Api";
import { GameHUD, GameOverlay, PlayerAvatar } from "./elements/GameElements";
import { PongApp } from "../game/PongGame";

type PlayerSlot = {
  id?: number; // id du joueur si déjà rempli
  name?: string; // nom du joueur
  avatar?: string; // url avatar
  isHost?: boolean;
};

export interface gameKeys {
  key: string;
  gameId: string;
  expires: string;
}

export type PageArgs = gameKeys & { nb_players: number };

/*===================================================================


	.1WatingMenu



===================================================================*/

export class WaitingMenu extends GameOverlay {
  private PLAYERCONTAINER_CLASS = `relative w-full h-96 mb-6`;
  private static readyPid: Set<number> = new Set();

  private header: Header = new Header(2, "Lobby").class(
    "text-3xl font-bold m-0 mb-6 text-center",
  ) as Header;

  private playerContainer: Div = new Div()
    .withStyle(" position: relative;")
    .class(this.PLAYERCONTAINER_CLASS)
    .withId("players-container") as Div;

  //feels kinda messy to put all those actions here but idk of a better way
  constructor(
    private openInviteMenu: () => any,
    private Ready: () => any,
    private Unready?: () => any,
  ) {
    super("!w-3/4 !max-w-4xl");
    this.addContent(
      new Div(this.header, this.playerContainer).class(`
                    flex flex-col justify-center items-center 
                    w-full h-full
                `),
    );
  }

  make_playerCards(
    ownId: number,
    Users: { pid: number; User: UserInfo }[],
    nb_players: number,
  ) {
    this.playerContainer.contents = [];
    console.log(JSON.stringify(Users));
    const getPositionStyle = (index: number, total: number): string => {
      const size = "width: 45%; height: 45%; position: absolute;";
      if (total === 2) {
        return index === 0 ?
            `${size} top: 27.5%; left: 2.5%;`
          : `${size} top: 27.5%; right: 2.5%;`;
      } else {
        const isTop = index < 2;
        const isLeft = index % 2 === 0;
        return `${size} ${isTop ? "top: 2.5%;" : "bottom: 2.5%;"} ${isLeft ? "left: 2.5%;" : "right: 2.5%;"}`;
      }
    };
    for (let i = 0; i < nb_players; i++) {
      const style = getPositionStyle(i, nb_players);
      let color: string | undefined = undefined;
      let slotClick = () => {};
      let UserInf: UserInfo | undefined;

      if (Users[i] === undefined) {
        UserInf = undefined;
        slotClick = this.openInviteMenu.bind(this);
      } else {
        UserInf = Users[i].User;

        if (WaitingMenu.readyPid.has(Users[i].pid)) {
          //slotClick = this.Unready ?? this.Ready.bind(this);
          color = "bg-emerald-700/60";
        } else if (UserInf.id === ownId) {
          slotClick = this.Ready.bind(this);
        }
      }
      this.playerContainer.addContent(
        new PlayerCard(UserInf, slotClick, color).withStyle(
          style,
        ) as PlayerCard,
      );
    }
    this.playerContainer.redrawInner();
    this.bindEvents();
  }

  add_ready(pid: number) {
    WaitingMenu.readyPid.add(pid);
  }

  clear_ready() {
    WaitingMenu.readyPid.clear();
  }

  delete_ready(pid: number) {
    WaitingMenu.readyPid.delete(pid);
  }
}

export class InviteMenu extends GameOverlay {
  private static friendState: Map<
    number,
    { border: "none" | "blue" | "red" | "green" }
  > = new Map();
  static gameId: string = "";

  private MAIN_CONTAINER_CLASS = `
        flex flex-col 
        w-full max-w-lg h-[500px] 
        bg-zinc-800/80 rounded-xl 
        p-4 gap-4
        shadow-xl border border-white/10
    `;

  private mockFriends: UserInfo[] = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    username: `Friend${i + 1}`,
    lastSeen: new Date(
      Date.now() - Math.random() * 4 * 60 * 1000,
    ).toISOString(),
  }));

  private friendElements: AElement[] = [];

  private header: Header = new Header(2, "Invite Players").class(
    "text-3xl font-bold m-0 mb-4 text-center text-white drop-shadow-md",
  ) as Header;

  private textbar: Textbox = new Textbox("friend-searchbar")
    .class(
      "w-full p-3 rounded-lg text-white bg-zinc-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all",
    )
    .class(INPUT_BOX_OUTLINE) as Textbox;

  private friendContainer: Div = new Div()
    .class(
      "flex flex-col overflow-y-auto gap-2 pr-2 scrollbar-thin scrollbar-thumb-gray-600",
    )
    .withId("customgame-friends-container") as Div;

  private closeButton: Button = new Button(
    new Paragraph("X").class("text-black text-2xl font-bold leading-none"),
  )
    .class(
      `
        absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2
        w-10 h-10 rounded-full 
        bg-pink-500 hover:bg-pink-400 
        shadow-lg 
        flex items-center justify-center 
        transition-colors duration-200
        z-50
    `,
    )
    .withId("CloseInvitePanel-Button") as Button;

  private MainContainer: Div = new Div(this.textbar, this.friendContainer)
    .class(this.MAIN_CONTAINER_CLASS)
    .withId("customgame-invitemain-container") as Div;

  constructor(private onExit: () => any) {
    super("flex items-center justify-center relative");

    const contentWrapper = new Div(this.header, this.MainContainer).class(`
            flex flex-col justify-center items-center 
            w-full p-6 relative
        `);
    this.addContent([contentWrapper, this.closeButton]);

    this.closeButton.withOnclick(this.onExit.bind(this));

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
    console.log("onentersearch", value);
    try {
      const resp = await fetch(`/api/v1/users/${value}`, {
        method: "GET",
      });
      if (resp.ok) {
        const id = ((await resp.json()) as UserInfo).id;
        await this.invite(id);
        this.textbar.removeClass(`focus:ring-pink-500`);
        this.textbar.class(`focus:ring-blue-500`);
        this.textbar.update_classes();
      } else if (!resp.ok) {
        this.textbar.removeClass(`focus:ring-pink-500`);
        this.textbar.class(`focus:ring-red-500`);
        this.textbar.update_classes();
      }
    } catch {
      console.log("error on search");
    }
    setTimeout(() => {
      this.textbar.removeClass(`focus:ring-blue-500`);
      this.textbar.removeClass(`focus:ring-red-500`);
      this.textbar.class(`focus:ring-pink-500`);
      this.textbar.update_classes();
    }, 1000);
  }

  async invite(id: number): Promise<Response> {
    console.log(id);
    const resp = await fetch(`/api/v1/games/${InviteMenu.gameId}/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId: InviteMenu.gameId,
        invitedPlayerIds: [id],
      }),
    });
    return resp;
  }

  private async selectFriend(id: number) {
    const state = InviteMenu.friendState.get(id);
    if (state && state.border === "green") return;
    else InviteMenu.friendState.set(id, { border: "blue" });
    try {
      await this.invite(id);
    } catch {}
    this.applyFriendStyles();
  }

  private applyFriendStyles() {
    this.friendElements.forEach((el) => {
      const id = Number(el.id!.replace("friend-", ""));
      const st = InviteMenu.friendState.get(id);

      const bg = "bg-zinc-700/50";
      let border: string;
      if (!st) border = "border border-transparent";
      else {
        border =
          st.border === "blue" ? "border border-blue-500"
          : st.border === "red" ? "border border-red-700"
          : st.border === "green" ?
            "border border-emerald-700 border-emerald-700"
          : "border border-transparent";
      }
      el.removeClass("border-blue-500 border-red-700 border-transparent");
      el.class(`${border}`);
      el.update_classes();
    });
    //"flex items-center w-full p-2 rounded-lg cursor-pointer transition-colors shrink-0 h-16 bg-zinc-700/50 hover:bg-zinc-600",
    //could need to redraw
  }

  clear_friendState() {
    InviteMenu.friendState.clear();
  }

  set_friendstate(id: number, state: "none" | "blue" | "red" | "green") {
    InviteMenu.friendState.set(id, { border: state });
  }

  async updatefriendlist() {
    let friends: UserInfo[] | undefined;
    const resp = await fetch(`/api/v1/user/friends`, {
      method: "GET",
    });
    if (resp.ok) friends = (await resp.json()) as UserInfo[];
    if (!friends) friends = [];
    const onlineFriends = friends.filter(
      (friend) =>
        !friend.lastSeen
        || Date.now() - new Date(friend.lastSeen).getTime() <= 5 * 60 * 1000,
    );

    const newfriendElements = onlineFriends.map((friend) =>
      new Div(
        new Image(`/api/v1/user/avatars/${friend.username}.webp`).class(
          "rounded-full w-10 h-10 object-cover border border-white/20",
        ),
        new Paragraph(friend.username).class(
          "text-white text-lg font-medium truncate ml-3 flex-grow",
        ),
      )
        .class(
          "flex items-center w-full p-2 rounded-lg cursor-pointer transition-colors shrink-0 h-16 bg-zinc-700/50 hover:bg-zinc-600",
        )
        .withOnclick(() => this.selectFriend(friend.id))
        .withId(`friend-${friend.id}`),
    );

    this.friendContainer.removeContent(...this.friendElements);
    this.friendContainer.addContent(newfriendElements);
    this.friendElements = newfriendElements;
    this.applyFriendStyles(); // ← réapplique les couleurs persistantes
    this.redrawInner();
  }
}

export class GameEndMenu extends GameOverlay {
  private finalScoresDiv = new Div()
    .withId("final-scores")
    .class("mb-8") as Div;

  private resultParagraph: Paragraph = new Paragraph("UNKNOWN").withId(
    "ResultParagraph",
  ) as Paragraph;
  private resultDiv: Div = new Div().class("mb-6 text-center") as Div;

  private gameOverParagrpah = new Paragraph("Game Over!").class(
    "text-4xl font-bold text-white mb-8 text-center",
  ) as Paragraph;

  private exitButtonDiv = new Div().class("flex gap-4 justify-center");
  private exitButton = new Button(new Paragraph("Exit").class("py-3 px-8"))
    .class(DEFAULT_BUTTON)
    .withId("exit-btn") as Button;

  private main_content = new Div().withId("gameover-maindiv") as Div;

  constructor(private onClick: () => any) {
    super();

    this.exitButton.withOnclick(this.onClick.bind(this));
    this.main_content.addContent([
      this.gameOverParagrpah,
      this.finalScoresDiv,
      this.exitButtonDiv,
    ]);
    this.resultDiv.addContent(this.resultParagraph);

    this.contents = [this.main_content];
  }

  displayFinalScores(
    myPid: number,
    users: UserInfo[],
    finalScores: { pid: number; score: number }[],
  ): void {
    const elements: AElement[] = [];

    const rankedScores = finalScores
      .map((data, pid) => ({ pid: pid, score: data.score }))
      .sort((a, b) => b.score - a.score);

    const winner = rankedScores[0];
    const second = rankedScores[1];
    const isDraw = winner.score === second.score;

    if (isDraw) {
      {
        this.resultParagraph.withStyle(`color : ${DRAW_COLOR};`);
        this.resultParagraph.set_TextContent("Draw!");
      }
    } else if (winner.pid === myPid) {
      this.resultParagraph.withStyle(`color : ${VICTORY_COLOR};`);
      this.resultParagraph.set_TextContent("VICTORY!");
    } else {
      this.resultParagraph.withStyle(`color : ${DEFEAT_COLOR};`);
      this.resultParagraph.set_TextContent("DEFEAT....");
    }
    this.finalScoresDiv.redrawInner();
  }
}

/*==========================================================================


							..PlayerCard


============================================================================*/

export class PlayerCard extends Div {
  private BACKGROUND_STYLE = `
		w-full h-full
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

  private avatarImage: Image;
  private avatarDiv: Div;
  private waitingParagraph: Paragraph;
  private waitingDiv: Div;

  isfulled: boolean = this.playerInfo != undefined;

  constructor(
    private playerInfo?: UserInfo,
    private onClick?: () => void,
    private bg_color: string = "bg-gray-800/50",
  ) {
    super();
    this.mainContents.class(bg_color);
    this.avatarImage = new Image(
      this.playerInfo?.avatarUrl ?? "/api/v1/user/avatars/default.webp",
    ).class("absolute z-0") as Image;

    this.avatarDiv = new Div(this.avatarImage).class(AVATAR_DIV) as Div;

    this.waitingParagraph = new Paragraph(
      this.playerInfo?.username ?? "Waiting...",
    )
      .class("text-white font-bold text-xs")
      .withId("Playercard-text-section" + this._id) as Paragraph;

    this.waitingDiv = new Div(this.waitingParagraph).withStyle(
      "max-width: 80%;",
    ) as Div;

    this.withId("player-card" + this._id).class("min-w-[120px] min-h-[120px]");

    this.mainContents.addContent([this.avatarDiv, this.waitingDiv]);

    this.contents = [this.mainContents];

    if (!this.isfulled) {
      this.setWaiting();
    } else {
      this.setPlayer();
    }
  }

  setPlayer() {
    this.isfulled = true;
    this.killWaitingDots();
    this.bindHoverEffect();
    this.unbindHoverEffect();
    this.redrawInner();
  }

  setWaiting() {
    this.animateWaitingDots();
    this.bindHoverEffect();
    this.class("grayscale");
  }

  update(userInfo?: UserInfo) {
    this.playerInfo = userInfo;
  }

  private animateWaitingDots() {
    let count = 0;
    this.waitInterval = setInterval(() => {
      count = (count + 1) % 4;
      const dots = ".".repeat(count);
      this.waitingParagraph.set_TextContent(`Waiting${dots}`);
    }, 500);
  }

  forceMouseLeave() {
    this.mainContents.removeClass("blur-xs");
    this.removeContent(this.overlayPlus);
    this.redrawInner();
  }

  bindHoverEffect() {
    setTimeout(() => {
      const el = this.byId();
      if (!el) return;
      if (!this.isfulled) {
        this.withOnEnter(() => {
          console.log("PlayerCard OnMouseEnter"); //debug
          this.mainContents.class("blur-xs");
          this.mainContents.update_classes();
          this.addContentWithAppend(this.overlayPlus);
        });

        this.withOnLeave(() => {
          console.log("PlayerCard OnMouseLeave"); //debug
          this.mainContents.removeClass("blur-xs");
          this.mainContents.update_classes();
          this.UnAppendContent(this.overlayPlus);
        });
      }
      this.withOnclick(this.onClick?.bind(this) ?? (() => {}));
      this.bindEvents();
    });
  }

  private unbindHoverEffect() {
    const el = this.byId();
    if (!el) return;

    this.withOnEnter(() => {});
    this.withOnLeave(() => {});
  }

  private killWaitingDots() {
    if (this.waitInterval !== null) {
      clearInterval(this.waitInterval);
      this.waitInterval = null;
    }
  }
}

//TODO
/*
	on join after invite then not host
	on create then host

	need to manage dynamic update for  client since he does not know how many players there is 
*/
export class CustomGamePage extends Page {
  static isInDuel = false;
  static forceExit = false;

  private playerSlots: PlayerSlot[] = Array(4).fill({}); // 4 places
  private finalScores: { pid: number; score: number }[] = [];
  private currentUserId = APP.userInfo?.id;
  private isHost = true;
  private gameKey: gameKeys | null = null;
  private gameInstance: PongApp | null = null;
  private invitedFriends: { id: number; name: string; avatar: string }[] = [];
  private IngamePlayers: { pid: number; User: UserInfo }[] = [];

  private myAvatarUrl?: string;
  private queueState: QueueState = "waiting";
  private free_slot: string[] = [];
  private overlayDiv: Div = new Div();
  private finalScoresDiv: Div = new Div();

  private nb_p: number;

  private gameScreen = new Div(
    new Div().withId("canvas-container").class("absolute inset-0 bg-gray-900"),

    new Div()
      .withId("game-hud")
      .class("absolute top-0 left-0 right-0 bg-zinc-800 p-4"),
  )
    .withId("game-screen")
    .class("relative w-full h-screen overflow-hidden") as Div;

  private mainContents: Div = new Div().withId(
    "custompage-main-container",
  ) as Div;

  private Waiting_menu: WaitingMenu = new WaitingMenu(
    this.openInvitePanel.bind(this),
    this.onReadyClick.bind(this),
  ).withId("Customgame-waitingMenu") as WaitingMenu;
  private Invite_menu: InviteMenu = new InviteMenu(
    this.closeInvitePanel.bind(this),
  ).withId("Customgame-waitingMenu") as InviteMenu;
  private EndGame_menu!: GameEndMenu;

  constructor(
    router: Router,
    private Options?: PageArgs,
  ) {
    super(router, false);
    if (!Options) {
      alert("Kind soul... There is no coming back.");
      this.OnExitClick();
    }
    //alert(`Option = ${Options?.gameId}, ${Options?.nb_players}, ${Options?.key},${Options?.expires}`);
    this.nb_p = Options?.nb_players as number;
    if (this.nb_p === -1) {
      this.isHost = false;
      Options!.nb_players = 2;
      this.nb_p = 2;
    }

    if (CustomGamePage.isInDuel) this.startForceExitWatcher();
    this.EndGame_menu = new GameEndMenu(this.OnExitClick.bind(this));
    this.mainContents.addContent(this.Waiting_menu);
    this.mainContents.redrawInner();
    this.gameKey = Options as gameKeys;
    this.queueState = "waiting";

    APP.headerRoot.style.display = "none";
  }

  private initialiseGame(): void {
    const container = document.getElementById("canvas-container");
    if (!container) {
      return;
    }

    if (!this.gameKey) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.id = "gameCanvas";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.tabIndex = 1;
    container.innerHTML = "";
    container.appendChild(canvas);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws`;

    this.gameInstance = new PongApp(wsUrl, this.gameKey.key, APP.userInfo?.id);
    this.setupGameListeners();
    canvas.focus();

    (this as any).pidCheckInterval = setInterval(() => {
      if (
        this.gameInstance
        && this.gameInstance.myPid !== undefined
        && this.gameInstance.myPid !== -1
      ) {
        clearInterval((this as any).pidCheckInterval);
        delete (this as any).pidCheckInterval;

        this.createGameHUD();
      }
    }, 50);
    if (!this.isHost) {
      this.nb_p = this.gameInstance.params.nPlayers;
      this.Options!.nb_players = this.gameInstance.params.nPlayers;
    }
  }

  private restoreHeader(): void {
    APP.headerRoot.style.display = "";
  }

  bindEvents(): void {
    this.initialiseGame();
    this.renderQueueState();
    InviteMenu.gameId = this.Options?.gameId!;
    if (this.queueState !== "finished") {
    }
  }

  private clearstate() {
    this.resetGame();
    this.stopForceExitWatcher();
    this.Waiting_menu.clear_ready();
    this.Invite_menu.clear_friendState();
    this.restoreHeader();
    CustomGamePage.forceExit = false;
    CustomGamePage.isInDuel = false;
  }

  transitionAway(): void {
    if (this.queueState !== "finished" && this.gameKey) {
    }
    this.clearstate();
  }

  content(): AElement[] {
    return [this.gameScreen, this.mainContents];
  }

  private createGameHUD(): void {
    const hudContainer = document.getElementById("game-hud");
    const nbPlayers = this.Options?.nb_players || 2;

    if (!hudContainer || !this.gameInstance) return;

    const myPid = this.gameInstance.myPid;
    if (myPid === undefined || myPid === -1) return;

    const players = Array.from({ length: nbPlayers }, (_, pid) => {
      const isMe = pid === myPid;
      const scoreId = `score-${pid}`;
      const color = PLAYER_COLOURS[pid % PLAYER_COLOURS.length];

      const position: "left" | "right" =
        nbPlayers === 2 ?
          isMe ? "left"
          : "right"
        : pid % 2 === 0 ? "left"
        : "right";

      if (isMe) {
        const myAvatar =
          APP.userInfo?.username ?
            `/api/v1/user/avatars/${APP.userInfo.username}.webp`
          : undefined;
        this.myAvatarUrl = myAvatar;
        return new PlayerAvatar("You", scoreId, color, position, myAvatar);
      }

      const ingamePlayer = this.IngamePlayers.find((p) => p.pid === pid);
      const playerName = ingamePlayer?.User.username || `Player ${pid + 1}`;
      const playerAvatar =
        ingamePlayer?.User.username ?
          `/api/v1/user/avatars/${ingamePlayer.User.username}.webp`
        : `/api/v1/user/avatars/default.webp`;

      return new PlayerAvatar(
        playerName,
        scoreId,
        color,
        position,
        playerAvatar,
      );
    });

    hudContainer.innerHTML = new GameHUD(players)
      .withId("game-hud-content")
      .render();
  }

  async getUserInfo(user_id: number): Promise<UserInfo | undefined> {
    try {
      const resp = await fetch(`/api/v1/users/${user_id}`, { method: "GET" });
      if (resp.ok) return (await resp.json()) as UserInfo;
    } catch {
      console.error(`Failed to fetch info for User${user_id}`);
      return;
    }
  }

  async getIngamePlayers(): Promise<{ pid: number; User: UserInfo }[]> {
    if (this.IngamePlayers.length >= this.nb_p) {
      return this.IngamePlayers;
    }
    const playersMap = this.gameInstance?.playerUserIds;
    if (!playersMap) return [];
    const entries = Array.from(playersMap.entries());

    const fetches = entries.map(async ([pid, userId]) => {
      if (userId == null) return null;
      const user = await this.getUserInfo(userId);
      return user ? { pid, User: user } : null;
    });

    const resolved = await Promise.all(fetches);

    const valid = resolved.filter(
      (e): e is { pid: number; User: UserInfo } => e !== null,
    );
    this.IngamePlayers = valid.slice(0, this.nb_p);

    return this.IngamePlayers;
  }

  private async renderQueueState() {
    this.mainContents.removeContent(this.Waiting_menu);
    this.mainContents.removeContent(this.Invite_menu);
    this.mainContents.removeContent(this.EndGame_menu);
    switch (this.queueState) {
      case "inviting":
        //this.mainContents.addContent(this.Waiting_menu);
        this.mainContents.addContent(this.Invite_menu);
        break;
      case "waiting":
        this.Waiting_menu.make_playerCards(
          APP.userInfo!.id,
          await this.getIngamePlayers(),
          this.nb_p,
        );
        //this.mainContents.addContent(this.Invite_menu);
        this.mainContents.addContent(this.Waiting_menu);
        break;
      case "ready":
        break;
      case "playing":
        //this.mainContents.removeContent();
        break;
      case "finished":
        this.mainContents.addContent(this.EndGame_menu);
        break;
    }
    this.mainContents.bindEvents();
    this.mainContents.redrawInner();
  }

  private setupGameListeners(): void {
    if (!this.gameInstance?.sock) return;

    const originalHandler = this.gameInstance.sock.onmessage;
    this.gameInstance.sock.onmessage = (ev: MessageEvent) => {
      originalHandler?.call(this.gameInstance!.sock, ev);

      try {
        const msg = JSON.parse(ev.data);
        switch (msg.type) {
          case "player_ready":
            this.Waiting_menu.add_ready(msg.pid);
            break;
          case "game_join":
            if (!this.isHost) {
              this.nb_p = this.gameInstance!.params.nPlayers;
              this.Options!.nb_players = this.gameInstance!.params.nPlayers;
            }
            break;
          case "player_list": {
            if (this.queueState !== "waiting") break;

            msg.players
              ?.filter((p: any) => p.userId != null)
              .forEach((p: any) =>
                this.Invite_menu.set_friendstate(p.userId, "green"),
              );
            break;
          }
          case "game_start": {
            this.queueState = "playing";
            this.createGameHUD();
            this.startUIUpdates();
            this.stopForceExitWatcher();
            break;
          }
          case "game_end":
            this.onGameEnd(msg);
            break;
          case "game_abandoned":
            alert("Game was abandoned: " + msg.reason);
            this.OnExitClick();
            break;
        }
        this.renderQueueState();
      } catch (e) {
        // Ignore parse errors
      }
    };
  }

  private initializeGameUI(): void {
    const hudContainer = document.getElementById("game-hud");
    if (hudContainer) {
      hudContainer.innerHTML = "";
    }
  }

  private resetGame(): void {
    if ((this as any).updateIntervalId) {
      clearInterval((this as any).updateIntervalId);
      delete (this as any).updateIntervalId;
    }

    if ((this as any).pidCheckInterval) {
      clearInterval((this as any).pidCheckInterval);
      delete (this as any).pidCheckInterval;
    }

    if (this.gameInstance) {
      this.gameInstance.dispose();
      this.gameInstance = null;
    }

    const container = document.getElementById("canvas-container");
    if (container) container.innerHTML = "";

    const hudContainer = document.getElementById("game-hud");
    if (hudContainer) hudContainer.innerHTML = "";

    this.gameKey = null;
    this.finalScores = [];
    this.queueState = "waiting";
  }

  private onGameEnd(msg: any): void {
    if ((this as any).updateIntervalId) {
      clearInterval((this as any).updateIntervalId);
      delete (this as any).updateIntervalId;
    }
    const players =
      msg.players?.length > 0 ?
        msg.players
      : this.gameInstance?.gameState?.players;
    if (players) {
      this.finalScores = players.map((p: any, idx: number) => ({
        player: idx + 1,
        score: p.score,
      }));
    }
    this.EndGame_menu.displayFinalScores(
      this.gameInstance!.myPid,
      this.IngamePlayers.map((e) => e.User),
      this.finalScores,
    );
    this.queueState = "finished";
  }

  //during game i guess
  private startUIUpdates(): void {
    const intervalId = setInterval(() => {
      if (!this.gameInstance?.gameState) return;

      const { gameState, params } = this.gameInstance;

      for (let i = 0; i < 2; i++) {
        const scoreEl = document.getElementById(`score-${i}`);
        if (scoreEl && gameState.players?.[i]) {
          scoreEl.textContent = String(gameState.players[i].score);
        }
      }
      const timerEl = document.getElementById("game-timer");
      if (!timerEl) return;

      if (gameState.pauseCd > 0) {
        const countdown = Math.ceil((gameState.pauseCd * params.tickMs) / 1000);
        timerEl.textContent = String(countdown);
        timerEl.classList.remove(...TIMER_NORMAL);
        timerEl.classList.add(...TIMER_COUNTDOWN);
      } else {
        const seconds = Math.floor(gameState.time / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timerEl.textContent = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
        timerEl.classList.remove(...TIMER_COUNTDOWN);
        timerEl.classList.add(...TIMER_NORMAL);
      }
    }, 100);
    (this as any).updateIntervalId = intervalId;
  }

  static force_exit() {
    this.forceExit = true;
  }

  /*=================================================================
			  
								Buttons Actions
			  
		===================================================================*/
  openInvitePanel() {
    console.log("");
    this.queueState = "inviting";
    this.renderQueueState();
  }

  closeInvitePanel() {
    console.log("on exit panel");
    this.queueState = "waiting";
    this.renderQueueState();
  }

  onReadyClick() {
    console.log("on ready");
    if (!this.gameInstance) return;

    if (this.gameInstance.player1?.ws.readyState === WebSocket.OPEN) {
      this.gameInstance.player1.ws.send(JSON.stringify({ type: "ready" }));
    }
    this.renderQueueState();
  }

  //idk if we can unready ??
  onUnReadyClick() {
    if (!this.gameInstance) return;

    if (this.gameInstance.player1?.ws.readyState === WebSocket.OPEN) {
      this.gameInstance.player1.ws.send(JSON.stringify({ type: "ready" }));
    }

    this.renderQueueState();
  }

  OnExitClick() {
    this.clearstate();
    this.router.navigate("play");
  }

  private forceExitCheckInterval?: number;

  private startForceExitWatcher() {
    this.forceExitCheckInterval = window.setInterval(() => {
      if (CustomGamePage.forceExit) {
        console.log("Force exit triggered!");
        this.OnExitClick();
      }
    }, 1000);
  }

  private stopForceExitWatcher() {
    if (this.forceExitCheckInterval !== undefined) {
      clearInterval(this.forceExitCheckInterval);
      delete this.forceExitCheckInterval;
    }
    this.forceExitCheckInterval = undefined;
  }
}

type QueueState = "inviting" | "waiting" | "ready" | "playing" | "finished";
