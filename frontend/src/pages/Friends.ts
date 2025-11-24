import { API, UserInfo } from "../Api";
import { APP, createCustomGame, getUsername } from "../App";
import {
  AElement,
  Div,
  Inline,
  Paragraph,
  Image,
  Textbox,
  Button,
} from "./elements/Elements";
import Router from "../Router";
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
import { CustomGamePage } from "./CustomGame";

const makeSearchBar = (router: Router) => {
  const searchbar = new Textbox("search-username");
  const searchButton = new Button(
    new Paragraph("Search user").class("self-center"),
  )
    .class("font-bold self-center p-2 flex self-center")
    .class(HOW_TO_CENTER_A_DIV)
    .withId("search-user-btn")
    .withOnclick(async () => {
      try {
        const bar = searchbar.byId() as null | HTMLInputElement;
        if (!bar) return;
        const username = bar.value;
        if (!username) return;
        const req = await API.fetch(`/users/${username}`);
        if (!req.ok) throw new Error("Request failed");
        router.navigate(`/dashboard?user=${username}`);
      } catch (e: any) {
        alert("User not found");
      }
    });
  searchbar.withOnkeydown((e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchButton.byId()?.click();
    }
  });
  return new Div(
    searchbar.class(
      "rounded-xs text-2xl text-center outline-1 outline-neutral-700 focus:outline-neutral-400 p-1 mt-2",
    ),
    searchButton,
  ).class("flex gap-4 self-center ml-auto w-fit mr-auto mt-4");
};

const makeFriendCard =
  (router: Router) =>
  (f: UserInfo, i: number): AElement => {
    let statusText;
    if (((f.lastSeen as void | number) ?? 0) + 4 * 60_000 > Date.now()) {
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
      new Div(new Image(`/api/v1/user/avatars/${f.username}.webp`))
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
          .withOnclick(() => FriendCustomGame(f.id))
          .withId(`friends-page-invite-${i}`),
      ).class("flex flex-row gap-4 self-center"),
    ).class("p-4 h-24 w-160 flex flex-row gap-4");
  };

async function FriendCustomGame(id: number) {
  await createCustomGame(2, [id]);
  CustomGamePage.isInDuel = true;
}

const makeFriendIncomingCard =
  (router: Router) =>
  (f: UserInfo, i: number): AElement => {
    let statusText;
    if (((f.lastSeen as void | number) ?? 0) + 4 * 60_000 > Date.now()) {
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
      new Div(new Image(`/api/v1/user/avatars/${f.username}.webp`))
        .class("bg-zinc-800 m-1")
        .class(AVATAR_DIV)
        .withOnclick(navDashboard)
        .withId(`friends-page-in-pfp-${i}`),
      new Div(new Paragraph(f.username).class("font-bold text-xl"), statusText)
        .class("flex flex-col self-center select-none mr-auto")
        .withOnclick(navDashboard)
        .withId(`friends-page-in-name-${i}`),
      new Div(
        new Div(new Paragraph("Accept").class("self-center"))
          .class("pl-4 pr-4 flex gap-2 h-8")
          .class(DEFAULT_BUTTON)
          .class(HOW_TO_CENTER_A_DIV)
          .withOnclick(async () => {
            await fetch(`/api/v1/user/friends/requests/${f.username}`, {
              method: "PUT",
            }).catch(console.error);
            await router.currentPage?.loadData();
          })
          .withId(`friends-page-accept-${i}`),
        new Div(new Paragraph("Reject").class("self-center"))
          .class("pl-4 pr-4 flex gap-2 h-8")
          .class(EVIL_RED_BUTTON)
          .class(HOW_TO_CENTER_A_DIV)
          .withOnclick(async () => {
            await fetch(`/api/v1/user/friends/requests/${f.username}`, {
              method: "DELETE",
            }).catch(console.error);
            await router.currentPage?.loadData();
          })
          .withId(`friends-page-reject-${i}`),
      ).class("flex flex-row gap-4 self-center"),
    ).class("p-4 h-24 w-160 flex flex-row gap-4");
  };

const makeFriendOutgoingCard =
  (router: Router) =>
  (f: UserInfo, i: number): AElement => {
    let statusText;
    if (((f.lastSeen as void | number) ?? 0) + 4 * 60_000 > Date.now()) {
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
      new Div(new Image(`/api/v1/user/avatars/${f.username}.webp`))
        .class("bg-zinc-800 m-1")
        .class(AVATAR_DIV)
        .withOnclick(navDashboard)
        .withId(`friends-page-out-pfp-${i}`),
      new Div(new Paragraph(f.username).class("font-bold text-xl"), statusText)
        .class("flex flex-col self-center select-none mr-auto")
        .withOnclick(navDashboard)
        .withId(`friends-page-out-name-${i}`),
      new Div(
        new Div(new Paragraph("Cancel request").class("self-center"))
          .class("pl-4 pr-4 flex gap-2 h-8")
          .class(EVIL_RED_BUTTON)
          .class(HOW_TO_CENTER_A_DIV)
          .withOnclick(async () => {
            const ok = confirm(
              "You're going to cancel the outgoing friend request",
            );
            if (!ok) return;
            await fetch(
              `/api/v1/user/friends/requests/outgoing/${f.username}`,
              { method: "DELETE" },
            ).catch(console.error);
            await router.currentPage?.loadData();
          })
          .withId(`friends-page-cancel-${i}`),
      ).class("flex flex-row gap-4 self-center"),
    ).class("p-4 h-24 w-160 flex flex-row gap-4");
  };

export default class FriendsPage extends AListPage {
  searchBar?: AElement;
  username: string;

  constructor(router: Router) {
    super(router, "friends-page", titleForUser("Friends", getUsername() ?? ""));

    const username = getUsername()!;
    this.username = username;
  }

  content(): AElement[] {
    let ct = super.content();

    if (this.username === APP.userInfo?.username) {
      this.searchBar = makeSearchBar(this.router);
      ct.unshift(this.searchBar);
    }

    return ct;
  }

  bindEvents(): void {
    super.bindEvents();

    this.searchBar?.bindEvents();
  }

  async loadData(): Promise<void> {
    let path = "/user";
    if (this.username !== APP.userInfo?.username) {
      path = `/users/${this.username}`;
    }

    let resp, respOut, respIn;
    try {
      [resp, respOut, respIn] = await Promise.all([
        API.fetch(`${path}/friends`),
        API.fetch(`${path}/friends/requests/outgoing`),
        API.fetch(`${path}/friends/requests`),
      ]);
    } catch (e: any) {
      alert("Failed to fetch friends data");
      return;
    }

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
    const friendsOut = await respOut
      .json()
      .then(
        (x) =>
          x as ApiPaths["/user/friends"]["get"]["responses"]["200"]["content"]["application/json"],
      )
      .catch(console.error);
    const friendsIn = await respIn
      .json()
      .then(
        (x) =>
          x as ApiPaths["/user/friends"]["get"]["responses"]["200"]["content"]["application/json"],
      )
      .catch(console.error);

    if (!friends || !friendsOut || !friendsIn) {
      this.setContents([
        new Paragraph(
          "Failure: You failed to fetch friends data. What a disgrace.",
        )
          .class(EVIL_RED_BUTTON)
          .class("text-xl p-4"),
      ]);
    } else if (friends.length + friendsOut.length + friendsIn.length === 0) {
      this.setContents([
        new Paragraph("No frens here :(").class(MUTED_TEXT).class("text-xl"),
      ]);
    } else {
      let contents: AElement[] = [];
      if (friends.length) {
        contents = friends.map(makeFriendCard(this.router));
      }
      if (friendsIn.length) {
        contents.push(
          new Paragraph("Incoming requests").class("text-xl font-bold pt-4"),
        );
        contents.push(...friendsIn.map(makeFriendIncomingCard(this.router)));
      }
      if (friendsOut.length) {
        contents.push(
          new Paragraph("Outgoing requests").class("text-xl font-bold pt-4"),
        );
        contents.push(...friendsOut.map(makeFriendOutgoingCard(this.router)));
      }
      this.setContents(contents);
    }

    if (this.router.currentPage !== this) {
      return;
    }

    this.redrawList();
  }
}
