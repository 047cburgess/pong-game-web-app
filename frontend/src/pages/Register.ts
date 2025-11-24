import { API } from "../Api";
import { APP } from "../App";
import Router, { Page } from "../Router";
import {
  Div,
  AElement,
  Textbox,
  Paragraph,
  Button,
  Inline,
} from "./elements/Elements";
import { paths as ApiPaths } from "../PublicAPI";
import { HOW_TO_CENTER_A_DIV, INPUT_BOX_OUTLINE } from "./elements/CssUtils";
import {
  emailValidator,
  passwordValidator,
  usernameValidator,
} from "../FieldValidators";
import { GITHUB_LOGO } from "./elements/SvgIcons";

export default class RegisterPage extends Page {
  readonly userText = new Textbox("username");
  readonly emailText = new Textbox("email");
  readonly passText = new Textbox("password").password();
  readonly passText2 = new Textbox("password2").password();
  readonly regButton: Button;
  readonly oauthButton: Button;

  private loggedOn: boolean = false;

  constructor(router: Router) {
    super(router, false);
    this.loggedOn = !!APP.userInfo;

    this.oauthButton = new Button(
      new Inline(GITHUB_LOGO),
      new Paragraph("Sign in with GitHub").class("p-2 text-xl"),
    )
      .class("flex")
      .class(HOW_TO_CENTER_A_DIV)
      .withOnclick(this.callOauth.bind(this))
      .withId("oauth-btn") as Button;

    this.regButton = new Button(
      new Paragraph("Sign up →").class(
        "text-2xl p-2 select-none self-center text-center",
      ),
    )
      .class(HOW_TO_CENTER_A_DIV)
      .class("flex")
      .withOnclick(this.trySignup.bind(this))
      .withId("sign-in-btn") as Button;
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

  async trySignup() {
    const username = (this.userText.byId() as HTMLInputElement).value;
    const email = (this.emailText.byId() as HTMLInputElement).value;
    const pass = (this.passText.byId() as HTMLInputElement).value;

    if (
      emailValidator(email) !== null
      || usernameValidator(username) !== null
      || passwordValidator(pass) !== null
      || pass !== (this.passText2.byId() as HTMLInputElement).value
    ) {
      alert("Please ensure you've entered valid values in all fields");
      return;
    }

    let resp;
    try {
      resp = await fetch("/api/v1/user/register", {
        method: "POST",
        body: JSON.stringify({
          username: (this.userText.byId() as HTMLInputElement).value,
          email: (this.emailText.byId() as HTMLInputElement).value,
          password: (this.passText.byId() as HTMLInputElement).value,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (e: any) {
      alert("Failed to sign up" + (e && ": " + e));
      return;
    }
    if (!resp.ok) {
      const text = await resp.text();
      alert("Failed to sign up" + (text && ": " + text));
      return;
    }

    resp = await API.fetch("/user");
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

  content(): AElement[] {
    if (this.loggedOn) return [];

    return [
      new Div(
        new Paragraph("Join the").class("font-normal -mb-4"),
        new Paragraph("LIBFT_TRANSCENDENCE").class("text-4xl"),
        new Paragraph("The future of Pong is now.").class(
          "font-normal pb-4 -mt-2",
        ),
        new Div(
          new Paragraph("Username:").class("text-xl").withId("username-label"),
          this.userText
            .withOnkeydown((e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                this.emailText.byId()?.focus();
              }
            })
            .withValidator(usernameValidator)
            .postValidation(() => this.errorsDiv(this.userText).redrawInner())
            .class("rounded-xs text-2xl text-center outline-1 p-1 mt-2")
            .class(INPUT_BOX_OUTLINE)
            .class("transition duration-200 ease-in-out"),
          this.errorsDiv(this.userText),
        )
          .withId("username-area")
          .withOnclick(() => this.userText.byId()?.focus()),
        new Div(
          new Paragraph("Email:").class("text-xl").withId("email-label"),
          this.emailText
            .withOnkeydown((e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                this.passText.byId()?.focus();
              }
            })
            .withValidator(emailValidator)
            .postValidation(() => this.errorsDiv(this.emailText).redrawInner())
            .class(
              "rounded-xs text-2xl text-center outline-1 outline-neutral-700 focus:outline-neutral-400 p-1 mt-2",
            ),
          this.errorsDiv(this.emailText),
        )
          .withId("email-area")
          .withOnclick(() => this.emailText.byId()?.focus()),
        new Div(
          new Paragraph("Password:").class("text-xl").withId("password-label"),
          this.passText
            .withOnkeydown((e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                this.passText2.byId()?.focus();
              }
            })
            .withValidator(passwordValidator)
            .withValidator(() => (this.passText2.runValidators(), null))
            .postValidation(() => this.errorsDiv(this.passText).redrawInner())
            .class(
              "rounded-xs text-2xl text-center outline-1 outline-neutral-700 focus:outline-neutral-400 p-1 mt-2",
            ),
          this.errorsDiv(this.passText),
        )
          .withId("password-area")
          .withOnclick(() => this.passText.byId()?.focus()),
        new Div(
          new Paragraph("Repeat password:")
            .class("text-xl")
            .withId("password2-label"),
          this.passText2
            .withOnkeydown((e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                this.trySignup();
              }
            })
            .withValidator((val) => {
              const other = (this.passText.byId() as HTMLInputElement | null)
                ?.value;
              if (val && val !== other) {
                return ["Passwords don't match"];
              }
              return null;
            })
            .postValidation(() => this.errorsDiv(this.passText2).redrawInner())
            .class(
              "rounded-xs text-2xl text-center outline-1 outline-neutral-700 focus:outline-neutral-400 p-1 mt-2",
            ),
          this.errorsDiv(this.passText2),
        )
          .withId("password2-area")
          .withOnclick(() => this.passText2.byId()?.focus()),
        this.regButton,
        new Paragraph("or").class("text-l mt-6 -mb-4"),
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

    const resp = await API.fetch("/user");
    let body;
    if (resp.ok || resp.status === 304) {
      body = (await resp.json().catch(console.error)) as
        | void
        | ApiPaths["/user"]["get"]["responses"]["200"]["content"]["application/json"];
    }
    if (body) {
      APP.onLogin(await resp.json());
      this.router.navigate("");
    }
  }

  errorsDiv(elem: Textbox) {
    const res = new Div();
    res.withId(elem.id + "-errdiv");
    new Set(elem.validationErrors ?? []).forEach((e) =>
      res.contents.push(new Paragraph("• " + e).class("text-red-500")),
    );
    return res;
  }
}
