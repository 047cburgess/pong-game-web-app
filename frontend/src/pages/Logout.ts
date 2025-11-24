import { APP } from "../App";
import Router, { Page } from "../Router";
import { HOW_TO_CENTER_A_DIV } from "./elements/CssUtils";
import { AElement, Div, Paragraph } from "./elements/Elements";

export default class LogoutPage extends Page {
  constructor(router: Router) {
    super(router);
  }

  content(): AElement[] {
    if (!APP.userInfo) {
      return [];
    }

    return [
      new Div(new Paragraph("Logging out..."))
        .class(HOW_TO_CENTER_A_DIV)
        .class("absolute top-1/2 left-1/2")
        .class("transform -translate-y-1/2 -translate-x-1/2")
        .class("flex flex-col select-none font-bold"),
    ];
  }

  async loadData(): Promise<void> {
    if (!APP.userInfo) {
      this.router.navigate("/");
      return;
    }

    let resp;
    try {
      resp = await fetch("/api/v1/user/logout", { method: "POST" });
    } catch (e: any) {
      // TODO
      return;
    }

    if (resp.ok) {
      APP.onLogout();
      this.router.navigate("/");
      return;
    }

    if (!resp.ok && resp.status !== 401) {
      alert("An error has occurred while trying to log out");
    }
  }
}
