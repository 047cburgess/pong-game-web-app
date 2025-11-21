import { API, UserInfo } from "../Api";
import { APP, getUsername } from "../App";
import { AElement, Div, Inline, Paragraph, Image } from "./elements/Elements";
import Router, { NavError } from "../Router";
import { ICON_CROSSED_SWORDS } from "./elements/SvgIcons";
import {
  DEFAULT_BUTTON,
  HOW_TO_CENTER_A_DIV,
  EVIL_RED_BUTTON,
  OFFLINE_GRAY,
  ONLINE_GREEN,
  MUTED_TEXT,
  AVATAR_DIV,
} from "./elements/CssUtils";
import { paths as ApiPaths } from "../PublicAPI";
import AListPage, { titleForUser } from "./AListPage";

const makeFriendCard =
  (router: Router) =>
  (f: UserInfo, i: number): AElement => {
    let statusText;
    if (
      f.lastSeen !== undefined
      && Date.parse(f.lastSeen) + 4 * 60_000 > Date.now()
    ) {
      statusText = new Paragraph("online").class(ONLINE_GREEN);
    } else {
      statusText = new Paragraph("offline").class(OFFLINE_GRAY);
    }
    statusText.class("-mt-1");

    const navDashboard = () => router.navigate(`/dashboard?user=${f.username}`);

    let avatarDiv = new Div();
    if (f.avatarUrl) {
      avatarDiv = new Div(new Image(f.avatarUrl));
    }

    return new Div(
      (f.avatarUrl ? new Div(new Image(f.avatarUrl)) : new Div())
        .class("bg-zinc-800 m-1")
        .class(AVATAR_DIV)
        .withOnclick(navDashboard)
        .withId(`friends-page-pfp-${i}`),
      new Div(new Paragraph(f.username).class("font-bold text-xl"), statusText)
        .class("flex flex-col self-center select-none mr-auto")
        .withOnclick(navDashboard)
        .withId(`friends-page-name-${i}`),
      new Div(
        new Div(
          new Inline(ICON_CROSSED_SWORDS).class("self-center"),
          new Paragraph("Invite to play").class("self-center"),
        )
          .class("pl-4 pr-4 flex gap-2 h-8")
          .class(DEFAULT_BUTTON)
          .class(HOW_TO_CENTER_A_DIV)
          // TODO(Vaiva): Invite friend to play
          .withOnclick(() => {})
          .withId(`friends-page-invite-${i}`),
        // new Div(new Inline(ICON_X).class("self-center")).class("flex p-2 aspect-square h-8")
        //   .class(EVIL_RED_BUTTON)
        //   .class(HOW_TO_CENTER_A_DIV)
        //   .withOnclick(() => { /* _: Remove friend confirmation popup */ })
        //   .withId(`friends-page-delete-${i}`),
      ).class("flex flex-row gap-4 self-center"),
    ).class("p-4 h-24 w-160 flex flex-row gap-4");
  };

export default class FriendsPage extends AListPage {
  username: string;

  constructor(router: Router) {
    super(router, "friends-page", titleForUser("Friends", getUsername() ?? ""));

    const username = getUsername();
    if (!username) throw new NavError(401);
    this.username = username;
  }

  async loadData(): Promise<void> {
    let path = "/user";
    if (this.username !== APP.userInfo?.username) {
      path = `/users/${this.username}`;
    }

    const resp = await API.fetch(`${path}/friends`);

    if (resp.status === 401) {
      APP.onLogout();
      this.router.navigate("/login");
      return;
    }
    if (resp.status === 404) {
      this.router.navigate(404, false);
      return;
    }

    const friends = await resp
      .json()
      .then(
        (x) =>
          x as ApiPaths["/user/friends"]["get"]["responses"]["200"]["content"]["application/json"],
      )
      .catch(console.error);

    if (!friends) {
      this.setContents([
        new Paragraph(
          "Failure: You failed to fetch friends data. What a disgrace.",
        )
          .class(EVIL_RED_BUTTON)
          .class("text-xl p-4"),
      ]);
    } else if (!friends.length) {
      this.setContents([
        new Paragraph("No frens here :(").class(MUTED_TEXT).class("text-xl"),
      ]);
    } else {
      this.setContents(friends.map(makeFriendCard(this.router)));
    }

    if (this.router.currentPage !== this) {
      return;
    }

    this.redrawList();
  }
}
