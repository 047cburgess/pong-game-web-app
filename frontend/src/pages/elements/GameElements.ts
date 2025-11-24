import { AElement, AContainer, Div, Paragraph } from "./Elements";
import { AVATAR_DIV } from "./CssUtils";

export class PlayerAvatar extends AContainer {
  playerName: string;
  scoreId: string;
  color: string;
  align: "left" | "right";
  avatarUrl?: string;

  constructor(
    playerName: string,
    scoreId: string,
    color: string,
    align: "left" | "right" = "left",
    avatarUrl?: string,
  ) {
    super();
    this.playerName = playerName;
    this.scoreId = scoreId;
    this.color = color;
    this.align = align;
    this.avatarUrl = avatarUrl;
  }

  render(): string {
    // If avatar URL exists, show profile picture with colored outline
    // Otherwise show solid colored circle (for local games with guests)
    const avatar =
      this.avatarUrl ?
        new Div()
          .class("w-10 h-10 min-w-10 min-h-10")
          .class(AVATAR_DIV)
          .withStyle(
            `background-image: url('${this.avatarUrl}'); background-size: cover; background-position: center; outline: 2px solid ${this.color};`,
          )
      : new Div()
          .class("w-10 h-10 min-w-10 min-h-10")
          .class(AVATAR_DIV)
          .withStyle(
            `background: ${this.color}; outline: 2px solid ${this.color};`,
          );

    const nameText = new Paragraph(this.playerName).class(
      "font-bold text-white",
    );

    const scoreText = new Paragraph("0")
      .withId(this.scoreId)
      .class("text-2xl font-bold")
      .withStyle(`color: ${this.color};`);

    if (this.align === "left") {
      const textContainer = new Div(nameText, scoreText);

      return new Div(avatar, textContainer)
        .class("flex items-center justify-center gap-3")
        .render();
    } else {
      nameText.class("text-right");
      scoreText.class("text-right");

      const textContainer = new Div(nameText, scoreText);

      return new Div(textContainer, avatar)
        .class("flex items-center justify-center gap-3")
        .render();
    }
  }
}

export class GameTimer extends AElement {
  constructor() {
    super();
    this.id = "game-timer";
  }

  render(): string {
    return `
      <div class="flex items-center justify-center" ${this.genTags()}>
        <p class="font-bold text-5xl text-white" id="${this.id}">00:00</p>
      </div>
    `;
  }
}

export class GameHUD extends AElement {
  players: PlayerAvatar[];
  timer: GameTimer;

  constructor(players: PlayerAvatar[]) {
    super();
    this.players = players;
    this.timer = new GameTimer();
  }

  render(): string {
    const columns: string[] = [
      "<div></div>",
      "<div></div>",
      "<div></div>",
      "<div></div>",
      "<div></div>",
    ];

    columns[2] = this.timer.render();

    if (this.players.length === 2) {
      // 2 players: columns 2 and 4
      columns[1] = this.players[0].render();
      columns[3] = this.players[1].render();
    } else if (this.players.length === 3) {
      // 3 players: columns 2, 4, 5 (pink left, green right, blue right)
      columns[1] = this.players[0].render();
      columns[3] = this.players[1].render();
      columns[4] = this.players[2].render();
    } else if (this.players.length === 4) {
      // 4 players: columns 1, 2, 4, 5 (pink+yellow left, green+blue right)
      columns[0] = this.players[0].render();
      columns[1] = this.players[3].render();
      columns[3] = this.players[1].render();
      columns[4] = this.players[2].render();
    }

    return `<div class="grid items-center gap-4" style="grid-template-columns: 1fr 1fr 1fr 1fr 1fr;" ${this.genTags()}>${columns.join("")}</div>`;
  }
}

export class GameOverlay extends AContainer {
  contentBoxClasses: string;

  constructor(contentBoxClasses: string = "", ...contents: AElement[]) {
    super(...contents);
    // Default classes + any custom classes passed in
    this.contentBoxClasses =
      `bg-black/80 backdrop-blur-md p-12 rounded-xl outline outline-2 outline-pink-500 ${contentBoxClasses}`.trim();
  }

  render(): string {
    return `
      <div class="absolute inset-0 flex items-center justify-center" ${this.genTags()}>
        <div class="${this.contentBoxClasses}">
          ${this.renderContents()}
        </div>
      </div>
    `;
  }
}

export class ColoredText extends AElement {
  text: string;
  color: string;

  constructor(text: string, color: string) {
    super();
    this.text = text;
    this.color = color;
  }

  render(): string {
    return `<span class="font-bold" style="color: ${this.color};" ${this.genTags()}>${this.text}</span>`;
  }
}
