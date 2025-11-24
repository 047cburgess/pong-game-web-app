import Router, { Page } from "../Router";
import { HOW_TO_CENTER_A_DIV, INPUT_BOX_OUTLINE } from "./elements/CssUtils";
import { AElement, Button, Div, Paragraph, Textbox } from "./elements/Elements";

export default class TwoFactorPage extends Page {
  readonly textbox: Textbox = new Textbox("code-2fa");
  readonly submitBtn: Button = new Button(new Paragraph("Verify"))
    .class("text-xl p-2")
    .withId("send-2fa")
    .withOnclick(this.submitCode.bind(this)) as Button;

  constructor(router: Router) {
    super(router, false);
  }

  content(): AElement[] {
    return [
      new Div(
        new Paragraph("Two-factor authentication").class("pb-4 text-2xl"),
        new Div(
          new Paragraph("Passcode:").class("self-center"),
          this.textbox
            .withOnkeydown((e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                this.submitBtn.byId()?.click();
              }
            })
            .class(INPUT_BOX_OUTLINE)
            .class("rounded-xs text-2xl text-center outline-1 p-1 mt-2")
            .class("transition duration-200 ease-in-out"),
        ).class("flex gap-4"),
        this.submitBtn,
      )
        .class("absolute top-1/2 left-1/2 transform text-xl")
        .class("-translate-y-1/2 -translate-x-1/2")
        .class("flex flex-col gap-2 pb-2 font-bold select-none")
        .class(HOW_TO_CENTER_A_DIV),
    ];
  }

  bindEvents() {
    this.textbox.bindEvents();
    this.submitBtn.bindEvents();
  }

  async submitCode() {
    const box = this.textbox.byId() as null | HTMLInputElement;
    if (!box) return;
    const val = box.value;
    if (!val) return;

    try {
      const resp = await fetch("/api/v1/user/login/two-factor", {
        method: "POST",
        body: JSON.stringify({ code: val }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(resp.status + (text ? ": " + text : ""));
      }
      this.router.navigate("");
    } catch (e: any) {
      alert("Failed to validate 2FA code: " + e);
    }
  }
}
