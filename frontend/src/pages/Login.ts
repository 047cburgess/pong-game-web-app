import { API } from "../Api";
import { APP } from "../App";
import Router, { Page } from "../Router";
import {
  Div,
  AElement,
  Textbox,
  Paragraph,
  Inline,
  Button,
} from "./elements/Elements";
import { paths as ApiPaths } from "../PublicAPI";
import { HOW_TO_CENTER_A_DIV } from "./elements/CssUtils";
import { GITHUB_LOGO } from "./elements/SvgIcons";

export default class LoginPage extends Page {
  readonly userText = new Textbox("username");
  readonly passText = new Textbox("password").password();
  readonly loginButton;
  readonly oauthButton;

  private loggedOn: boolean = false;

  constructor(router: Router) {
    super(router, false);
    this.loggedOn = !!APP.userInfo;

    this.loginButton = new Button(
      new Paragraph("Sign in →").class(
        "text-2xl p-2 select-none self-center text-center",
      ),
    )
      .class(HOW_TO_CENTER_A_DIV)
      .class("flex")
      .withOnclick(this.trySignin.bind(this))
      .withId("sign-in-btn");

    this.oauthButton = new Button(
      new Inline(GITHUB_LOGO),
      new Paragraph("Sign in with GitHub").class("p-2 text-xl"),
    )
      .class("flex")
      .class(HOW_TO_CENTER_A_DIV)
      .withOnclick(this.callOauth.bind(this))
      .withId("oauth-btn");
  }

  async trySignin() {
    // TODO(Vaiva): Sign in handler
    let resp;
    try {
      resp = await fetch("/api/v1/user/login", {
        method: "POST",
        body: JSON.stringify({
          username: (this.userText.byId() as HTMLInputElement).value,
          password: (this.passText.byId() as HTMLInputElement).value,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (e: any) {
      alert("Failed to sign in" + (e && ": " + e));
      return;
    }
    if (!resp.ok) {
      const text = await resp.text();
      alert("Failed to sign in" + (text && ": " + text));
      return;
    }

    await this.loadData();
  }

  async callOauth() {
    let resp;
    try {
      resp = await fetch("/api/v1/user/oauth/github", { method: "POST" });
    } catch (e: any) {
      alert("Failed to sign in" + (e && ": " + e));
      return;
    }
    if (!resp.ok) {
      const text = await resp.text();
      alert("Failed to sign in" + (text && ": " + text));
      return;
    }

    const url = new URL((await resp.json()).redirectUrl);
    url.searchParams.set(
      "redirect_uri",
      `${window.location.origin}/user/oauth/github/callback`,
    );

    window.open(url, "_self");
  }

  content(): AElement[] {
    if (this.loggedOn) return [];

    return [
      new Div(
        new Paragraph("LIBFT_TRANSCENDENCE").class("text-4xl"),
        new Paragraph("The final form of Pong.").class(
          "font-normal pb-4 -mt-2",
        ),
        new Div(
          new Paragraph("Username:").class("text-xl").withId("username-label"),
          this.userText
            // .withValidator(usernameValidator)
            .withOnkeydown((e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                this.passText.byId()?.focus();
              }
            })
            .class(
              "rounded-xs text-2xl text-center outline-1 outline-neutral-700 focus:outline-neutral-400 p-1 mt-2",
            ),
        )
          .withId("username-area")
          .withOnclick(() => this.userText.byId()?.focus()),
        new Div(
          new Paragraph("Password:").class("text-xl").withId("password-label"),
          this.passText
            .withOnkeydown((e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                this.trySignin();
              }
            })
            .class(
              "rounded-xs text-2xl text-center outline-1 outline-neutral-700 focus:outline-neutral-400 p-1 mt-2",
            ),
        )
          .withId("password-area")
          .withOnclick(() => this.passText.byId()?.focus()),
        this.loginButton,
        new Paragraph("or").class("text-l mt-8 -mb-4"),
        this.oauthButton,
      )
        .class("absolute top-1/2 left-1/2 transform")
        .class("-translate-y-1/2 -translate-x-1/2")
        .class("flex flex-col gap-2 pb-2 font-bold select-none")
        .class(HOW_TO_CENTER_A_DIV),
    ];
  }

  bindEvents(): void {
    this.content().forEach((x) => x.bindEvents());
  }

  async loadData(): Promise<void> {
    if (this.loggedOn) {
      this.router.navigate("");
    }

    const resp = await API.fetch("/user"); // TODO try catch
    let body;
    if (resp.ok || resp.status === 304) {
      body = (await resp.json().catch(console.error)) as
        | void
        | ApiPaths["/user"]["get"]["responses"]["200"]["content"]["application/json"];
    }
    if (body) {
      APP.onLogin(body);
      this.router.navigate("");
    }
  }
}
