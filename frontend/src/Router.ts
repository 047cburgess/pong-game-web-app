import { API } from "./Api";
import { APP } from "./App";
import { AElement } from "./pages/elements/Elements";

export abstract class Page {
  readonly router: Router;

  constructor(
    router: Router,
    needsAuth: boolean = true,
    protected Options?: any,
  ) {
    if (needsAuth && !APP.userInfo) {
      throw new NavError(401);
    }
    this.router = router;
  }

  abstract content(): AElement[];
  bindEvents(): void {}
  transitionIn(): null | void {
    return null;
  }
  transitionAway(): number | void {}

  async loadData(): Promise<void> {}
}

const AUTO_ANIM_PRE = [
  "transition",
  "ease-in-out",
  "duration-400",
  "opacity-100",
];
const AUTO_ANIM = ["transition", "ease-in-out", "duration-400", "opacity-0"];

export class NavError extends Error {
  error: number | string;

  constructor(error: number | string) {
    super();
    this.error = error;
  }
}

export default class Router {
  private routes: { [key: string]: new (r: Router, Options?: any) => Page } =
    {};
  private errors: { [key: string | number]: new (r: Router) => Page } = {};
  private rootElement: HTMLElement;

  private navPending?: NodeJS.Timeout;
  private currentPath?: string;
  currentPage?: Page;

  constructor() {
    this.rootElement = document.getElementById("app-root") as HTMLElement;

    window.addEventListener("popstate", () => {
      this.navigate(window.location.pathname, false);
    });
  }

  addRoute(path: string, pageCtor: new (r: Router) => Page): void {
    this.routes[path] = pageCtor;
  }

  addError(err: number | string, pageCtor: new (r: Router) => Page): void {
    this.errors[err] = pageCtor;
  }

  navigate(
    path: string | number,
    pushState: boolean = true,
    ctorOptions?: any,
  ): void {
    if (this.navPending) {
      return;
    }
    API.fetch("/user")
      .then(async (resp) => {
        if (resp.ok && !APP.userInfo) {
          console.log(resp);
          APP.onLogin(await resp.json());
          return;
        }
        if (resp.status === 401 && APP.userInfo) {
          this.navPending !== undefined && clearTimeout(this.navPending);
          delete this.navPending;
          APP.onLogout();
          this.navigate("/login");
        }
      })
      .catch(console.error);
    let routes = this.routes;
    if (typeof path === "number") {
      routes = this.errors;
      path = path.toString();
    }
    let cleanPath = path.startsWith("/") ? path.slice(1) : path;
    if (this.currentPath === cleanPath) {
      this.redraw();
      this.currentPage?.bindEvents();
      this.currentPage?.loadData();
      return;
    }
    this.currentPath = cleanPath;

    const page = this.routes[cleanPath.split("?")[0]];
    if (pushState) {
      history.pushState({}, "", `/${cleanPath}`);
    }

    let delay = 0;
    if (this.currentPage) {
      delay = this.currentPage.transitionAway() ?? 0;
    }
    if (this.currentPage && delay === 0) {
      requestAnimationFrame(() => {
        this.rootElement.classList.add(...AUTO_ANIM_PRE);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            this.rootElement.classList.remove(...AUTO_ANIM_PRE);
            this.rootElement.classList.add(...AUTO_ANIM);
          }),
        );
      });
      delay = 550;
    }

    this.navPending = setTimeout(() => {
      delete this.currentPage;
      delete this.navPending;
      if (page) {
        try {
          this.currentPage = new page(this, ctorOptions);
        } catch (e) {
          if (e instanceof NavError) {
            if (this.errors[e.error]) {
              this.currentPage = new this.errors[e.error](this);
            }
          } else {
            throw e;
          }
        }
      }
      if (!this.currentPage && this.errors[404]) {
        this.currentPage = new this.errors[404](this);
      }
      if (!this.currentPage) {
        this.currentPage = {
          router: this,
          content: () => {
            return [];
          },
          bindEvents: () => {},
          transitionIn: () => {
            return null;
          },
          transitionAway: () => {},
          loadData: async () => {},
        };
      }
      this.rootElement.classList.remove(...AUTO_ANIM, ...AUTO_ANIM_PRE);
      this.redraw();
      if (this.currentPage?.transitionIn() === null) {
        this.rootElement.classList.add(...AUTO_ANIM);
        requestAnimationFrame(() => {
          this.rootElement.classList.add(...AUTO_ANIM);
          requestAnimationFrame(() => {
            this.rootElement.classList.remove(...AUTO_ANIM);
            this.rootElement.classList.add(...AUTO_ANIM_PRE);
          });
        });
      }
      this.currentPage.bindEvents();
      this.currentPage.loadData();
    }, delay);
  }

  redraw(): void {
    this.rootElement.innerHTML = "";
    if (this.currentPage) {
      this.rootElement.innerHTML = this.currentPage
        .content()
        .map((e) => e.render())
        .join(" ");
    }
  }
}
