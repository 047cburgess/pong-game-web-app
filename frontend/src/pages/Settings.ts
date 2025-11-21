import { API, SelfInfo } from "../Api";
import { APP } from "../App";
import { usernameValidator } from "../FieldValidators";
import Router, { NavError, Page } from "../Router";
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
    `<input id="${this.fileInputId}" type="file" name="name" style="display:none;"/>`,
  ).withId(this.fileInputId);

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
            .withOnclick(() => this.fileInput.byId()?.click())
            .withId("upload-avatar-btn"),
          this.fileInput,
        )
          .class(HOW_TO_CENTER_A_DIV)
          .class("flex flex-col")
          .withOnclick(() => this.fileInput.byId()?.click())
          .withId("upload-avatar-div"),

        new Div(
          new Div(
            new Paragraph("New display name:").class("text-xl"),
            new Paragraph("(NOT USED FOR SIGN IN)").class(
              "text-xl text-red-900",
            ),
            this.usernameText
              .withValidator(usernameValidator)
              .postValidation(() =>
                this.errorsDiv(this.usernameText).redrawInner(),
              )
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
          alert("Failed to upload new avatar: " + e);
        });
        if (!resp) return;
        if (!resp.ok) {
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

          const avatarUrl2 = new PageHeader(this.router, APP.userInfo);
          (avatarUrl2.content()[0] as Div).redrawInner();
          avatarUrl2.bindEvents();
        }
      };
    }
  }

  async updateUsername() {
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
