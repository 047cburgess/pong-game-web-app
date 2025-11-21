import { API } from "../Api";
import { APP } from "../App";
import Router, { Page } from "../Router";
import { AElement, Div, Paragraph } from "./elements/Elements";
import { paths as ApiPaths } from "../PublicAPI";
import { HOW_TO_CENTER_A_DIV } from "./elements/CssUtils";

export default class GithubCallback extends Page {
  constructor(router: Router) {
    super(router, false);
  }

  content(): AElement[] {
    return [
      new Div(new Paragraph("Please wait..."))
        .class(HOW_TO_CENTER_A_DIV)
        .class("absolute top-1/2 left-1/2 text-neutral-600")
        .class("transform -translate-y-1/2 -translate-x-1/2")
        .class("flex flex-col select-none font-bold"),
    ];
  }

  async loadData(): Promise<void> {
    let resp;
    try {
      resp = await API.fetch(location.pathname + location.search);
    } catch (e: any) {
      // TODO
      return;
    }

    if (!resp.ok) {
      // TODO
      return;
    }

    try {
      resp = await API.fetch("/user");
    } catch (e: any) {
      // TODO
      return;
    }
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
