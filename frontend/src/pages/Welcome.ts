import Router, { Page } from "../Router";
import { Header, AElement, Div, Paragraph } from "./elements/Elements";

const KEY1 = ["-translate-y-1/3", "opacity-0"];
const KEY2 = ["-translate-y-1/2", "opacity-100"];
const KEY3 = ["-translate-y-2/3", "opacity-0", "duration-300"];

export default class WelcomePage extends Page {
  playButton = new Paragraph("Play →").withId("play-btn")
    .class("font-bold text-2xl mt-10 transition duration-1300")
    .class(KEY1.join(" "));

  titleCard = new Div([
    new Paragraph("Welcome to"),
    new Paragraph("LIBFT_TRANSCENDENCE")
      .class("font-bold text-5xl"),
    new Paragraph("Pong. Delivered to your doorstep."),
    this.playButton,
  ]).class("absolute top-1/2 left-1/2 transform -translate-x-1/2")
    .class("transition duration-1300 flex flex-col items-center select-none")
    .class(KEY1.join(" "))
    .withId("title-card");

  constructor(router: Router) {
    super(router);
  }

  content(): AElement[] {
    return [this.titleCard];
  }

  bindEvents() {
    const anims = [
      setTimeout(() => {
        this.titleCard.byId()?.classList.remove(...KEY1);
        this.titleCard.byId()?.classList.add(...KEY2);
      }, 200),
      setTimeout(() => {
        this.playButton.byId()?.classList.remove(...KEY1);
        this.playButton.byId()?.classList.add(...KEY2);
      }, 1500)
    ];

    const cb = () => {
      this.titleCard.byId()?.classList.remove(...KEY2, "duration-1300");
      this.titleCard.byId()?.classList.add(...KEY3);
      anims.forEach((a) => clearTimeout(a));
      setTimeout(() => this.router.navigate("play"), 300);
      this.playButton.byId()?.removeEventListener('click', cb);
    };
    this.titleCard.byId()?.addEventListener('click', cb);
  }
}
