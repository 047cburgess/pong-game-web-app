import { API, SelfInfo } from "../Api";
import { APP } from "../App";
import { usernameValidator } from "../FieldValidators";
import Router, { Page } from "../Router";
import {
  AVATAR_DIV,
  EVIL_RED_BUTTON,
  HOW_TO_CENTER_A_DIV,
  INPUT_BOX_OUTLINE,
} from "./elements/CssUtils";
import {
  AElement,
  Button,
  Div,
  Paragraph,
  Textbox,
  Image,
  Inline,
  Label,
} from "./elements/Elements";
import PageHeader from "./Header";

export default class SettingsPage extends Page {
  readonly usernameText: Textbox = new Textbox("username");
  readonly avatarDiv: Div = new Div(
    new Image("/api/v1/user/avatars/" + APP.userInfo?.username + ".webp"),
  )
    .class(AVATAR_DIV)
    .class("h-64")
    .withId("avatar-div") as Div;
  readonly fileInputId = "file-input";
  readonly fileInput: AElement = new Inline(
    `<input id="${this.fileInputId}" type="file" style="display:none;"/>`,
  ).withId(this.fileInputId);
  readonly toggle2faId = "two-factor-toggle";
  readonly toggle2fa: AElement = new Inline(
    `<input id="${this.toggle2faId}" type="checkbox"/>`,
  ).withId(this.toggle2faId);

  constructor(router: Router) {
    super(router);
  }

  content(): AElement[] {
    return [
      new Div(
        new Div(
          this.avatarDiv,
          new Button(
            new Paragraph("Change avatar").class(
              "text-xl p-2 select-none self-center text-center",
            ),
          )
            .class(HOW_TO_CENTER_A_DIV)
            .class("flex")
            .withId("upload-avatar-btn"),
          this.fileInput,
        )
          .class(HOW_TO_CENTER_A_DIV)
          .class("flex flex-col")
          .withOnclick(() => this.fileInput.byId()?.click())
          .withId("upload-avatar-div"),

        new Div(
          new Div(
            new Paragraph("New username:").class("text-xl"),
            this.usernameText
              .withValidator(usernameValidator)
              .postValidation(() =>
                this.errorsDiv(this.usernameText).redrawInner(),
              )
              .withOnkeydown((e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  new Button().withId("save-username-btn").byId()?.click();
                }
              })
              .class("rounded-xs text-2xl text-center outline-1 p-1 mt-2")
              .class(INPUT_BOX_OUTLINE)
              .class("transition duration-200 ease-in-out"),
            this.errorsDiv(this.usernameText),
          )
            .withId("username-area")
            .withOnclick(() => this.usernameText.byId()?.focus()),
          new Button(
            new Paragraph("Save username").class(
              "text-xl p-2 select-none self-center text-center",
            ),
          )
            .class(HOW_TO_CENTER_A_DIV)
            .class("flex")
            .withOnclick(this.updateUsername.bind(this))
            .withId("save-username-btn"),
        )
          .class(HOW_TO_CENTER_A_DIV)
          .class("flex flex-col"),

        new Div(
          new Label("Two factor authentication:")
            .withOnclick(() => {
              this.toggle2fa.byId()?.click();
            })
            .withId("two-factor-toggle-area"),
          this.toggle2fa,
        )
          .class(HOW_TO_CENTER_A_DIV)
          .class("flex gap-4 pb-4"),

        new Button(new Paragraph("Delete account").class("p-1"))
          .class(EVIL_RED_BUTTON)
          .class("w-full")
          .withOnclick(this.deleteAccount.bind(this))
          .withId("delete-account-btn"),
      )
        .class(HOW_TO_CENTER_A_DIV)
        .class("absolute top-1/2 left-1/2")
        .class("transform -translate-y-1/2 -translate-x-1/2")
        .class("flex flex-col select-none font-bold")
        .class("gap-8 w-82"),
    ];
  }

  errorsDiv(elem: Textbox) {
    const res = new Div();
    res.withId(elem.id + "-errdiv");
    new Set(elem.validationErrors ?? []).forEach((e) =>
      res.contents.push(new Paragraph("• " + e).class("text-red-500")),
    );
    return res;
  }

  bindEvents(): void {
    this.content().forEach((x) => x.bindEvents());

    const fileInput = this.fileInput.byId();
    if (fileInput) {
      fileInput.onchange = async (e) => {
        const self = e.target as HTMLInputElement;
        const file = self.files && self.files[0];
        if (!file) return;
        const data = new FormData();
        data.append("file", file);
        const resp = await fetch("/api/v1/user/avatar", {
          method: "POST",
          body: data,
        }).catch((e) => {
          alert("Failed to upload new avatar: " + e + "\nFile too large?");
        });
        if (!resp) return;
        if (!resp.ok && resp.status !== 304) {
          const text = await resp.text();
          alert(
            "Failed to upload new avatar: "
              + resp.status
              + (text && "\n" + text),
          );
        } else {
          this.avatarDiv.contents[0] = new Image(
            "/api/v1/user/avatars/" + APP.userInfo?.username + ".webp",
          );
          this.avatarDiv.redrawInner();

          const header = new PageHeader(this.router, APP.userInfo);
          (header.content()[0] as Div).redrawInner();
          header.bindEvents();
        }
      };
    }

    const toggle = this.toggle2fa.byId() as HTMLInputElement | null;
    if (toggle)
      toggle.onchange = async (e) => {
        const tgt = e.target as HTMLInputElement | null;
        if (!tgt) return;
        tgt.disabled = true;

        try {
          const resp = await fetch("/api/v1/user/two-factor", {
            method: tgt.checked ? "PUT" : "DELETE",
          });
          if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`${resp.status}${text ? ": " + text : ""}`);
          }
        } catch (e: any) {
          alert("Failed to update two factor authentication state: " + e);
          tgt.checked = !tgt.checked;
        } finally {
          tgt.disabled = false;
        }
      };
  }

  async loadData(): Promise<void> {
    try {
      const resp = await API.fetch("/user/two-factor");
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`${resp.status}${text ? ": " + text : ""}`);
      }
      const el = this.toggle2fa.byId() as void | HTMLInputElement;
      if (!el) return;
      el.checked = (await resp.json()).state;
    } catch (e: any) {
      alert("Failed to fetch 2fa state: " + e);
      return;
    }
  }

  async updateUsername() {
    if (this.usernameText.validationErrors !== null) {
      alert("Please check that your username is valid");
      return;
    }

    const resp = await fetch("/api/v1/user/username", {
      method: "PUT",
      body: JSON.stringify({
        username: (this.usernameText.byId() as HTMLInputElement).value,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }).catch((e) => alert(e));
    if (!resp) {
      return;
    }
    if (!resp.ok) {
      const text = await resp.text();
      alert("Failed to update username" + (text && ": " + text));
      return;
    }

    const respInfo = await API.fetch("/user");
    const info: SelfInfo | null =
      respInfo.ok || respInfo.status === 304 ?
        await respInfo.json().catch(console.error)
      : null;
    if (info) {
      APP.onLogin(info);
      alert("Username updated!");
    } else {
      APP.onLogout();
    }
  }

  async deleteAccount() {
    const conf = confirm(
      "You are about to delete your account.\nThis action is final\n(and will have dire consequences in the future)",
    );
    if (!conf) return;
    const resp = await fetch("/api/v1/user", {
      method: "DELETE",
    }).catch((e) => alert("Failed to delete account" + (e && ": " + e)));
    if (!resp) return;
    if (!resp.ok) {
      const text = await resp.text();
      alert("Failed to delete account" + (text && ": " + text));
      return;
    }
    await fetch("/api/v1/user/logout", { method: "POST" }).catch(console.error);
    APP.onLogout();
    this.router.navigate("");
  }
}
