import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { ManagerRegistry } from "./ManagerRegistry";
import { ManagerBase } from "./CommandManager";

const AVAILABLE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const defaultAvatarBase64 = "UklGRgoIAABXRUJQVlA4IP4HAABwOgCdASpZAVkBPjEYikQiIaER+fQMIAMEtLd+Kay3YA9uWfJR9/l93f9l/yH9A5tnd7ub1mfttpZ7F9r/dxiCcllVyj29Zf+5/Z70kfUXTq+0H0igrHjix6zMSOLHrMxI4seszEjix6zMSOLHrMxI4seszEjix6zMSOLHrMxI4seszEjix6zMSOLHaUfF/zRMAzZIuP9ZmI72ffcIf//h3F8viEYN0NQheCB/Bcf6zMNx3llA8HSZJ17QMBsB37HrMxI4pmTBLEqG2Jjabkt8h4zZIuP9NLzmkQ/pIgaN1BGQImJHFMXZIrQCImoTehZD23Q2SLj32KYr/IJ+DPj4Qbs2hskXH+swyrwCP6Q8gXQzd4LnN7VZNeg0dEjix6zMR60BgkaAO1jeY/3p135v3nh3DdDZIuP9Zlth/K84tLiRPpiLu9Tpo7pJaCI5VweOLHpmz/3v2Y+JkJ1P7ZMSlkuOZV8xSJqjzxxY9M7SSJo1D4eyZdAVkpfwdulCFaOLHW8Ksjxmm544semJRdbWFKwtY9ZmGzBwNdEMkcWPWI7r8ac/8nrMw34ciX9Y/obJFyBEwyBQFrqB+x6Z1yHT9j1mYjwhM9CrAsesTCd4tm/rMxI4pfdwemsQAAD++yg5wm6tN7ggAAAAAAAGlxVib1FyyJk7PFc6YZmnHE4lwwgBoidCGw3hirA6l7CSCEbCsmbP2zetlEYSvrHH+Mr+9Q1sQbq2gvmH5ERtc5UQ4mRXJ3YmwqbvcVP0mkcUzzrmfvDU9NtR4Y+Ii60KkZPtPtbp3iBwTumlT8Ol6a+7Da5zj21jgPBGhcv6pZjfzaaw1ZchDGSKESRNidadyvj2bDKOoNqgUtTO7EcBAepsO5Nfx8s6v1q7xZC7sbWA9iTjenseFkH3rg5tXtNg+7FKXtOvnQSTOuNNPSiLgQD2Uup/1oe/0+NBYlGhfidt+zfDe/nNNenA3OAay9U0zAXWbA6Z68cUl3LStISvSgq1qMyk2m/nEQn3EaNAYPYc1n6AKuhBMvzTx/1ZgFzc+yQn7MvoEg108dFBPpJCpZ3+V6pR6QLybbjz5/7r/DeVSo94ZhiN9vwge1mNW0wRZnahLAuqFZus6VyPLni3R2h2sOZtA89vL5oZ/HWeCjqLxcnbUzhcICawkVxHB4wouUE5r6nxdHEqZgd9IXhp/ZHm0tSxv2eQocHAX+gv9AyGdNYNtMZIDPCLdYp8eOycJ1rhcI/RB5V6hJbI1iyTRfplQETDCevd0nE6X9RgHELdh0N/t+7oQVQnBMwkRJ+iACaoWrEVVna46NbB1fGk0Py7SUZby7FbGd9vlTlmyaUIolJy47lFS/bz4+q9cCVasvfysLOSapBXO9izWALiNAptW67sr/DVNwDxvsmD2JvBYJvmNMAhdbF/9hi6ii1ZNMY2rCxBi2XGrYAeqrBtxKajtIc5mePl08/1Gmvouqgk0tSGeLczxcZatnTQx3V7IZ10F6o6sP0nb6v/+ITsqgmYR7/Fm2X9KJAdqSbg+lQ5IFZGQv5A/npzvSBBOLllJ7cYK4bvZpyzn7d/02/STHW9fCh9HIsW6RlkgC9TCbb0V/TUSwVvIm1z7xhgSMFlFFHOr8+K5gklIIYTNXHEV97Jik7uDn06jRtPjM4p6W2Dfix7aztaMXO5HkEahk4AEzHi6Vfanxz4mSI45Qa7D6e9zlK3qP1sq7BB0zJGi1oO6PRhHcJy431tYW/Gv4UtBXQf2CtbHN8BGkzT3ivRXkG+y8fkJjEyQSR1ljWKA0BUoTvJZ4oB0oehId62UrBVIs07xnWUq/oxS6pR4YmoOEauEMMEeFAIrlLjEtIpCtWg1IrN7WUz7Ej7PqPBkwZekukn9jP46h6vrgC3EP5p5RSfm45BDj208vpeqi8Wp7EPh3uSGUjT7VZy3rXornjUD1ydr0QoZlMsh03DXYj6/6yI5UKmtaaNo2XaHEVZ2+7M99fXRZthcb9nSc3ZTXjlgVBX6XlAN+4PSwCETD4lGJs8nXWEK5OuiAPJWUSHlIPrFwmJmzHd3kUgyDzfeBs9u5Rv5uEhwnkWkiVQCviznOhEVWLO+HM6+vMk1Sqhfv2Lobrp7EGWVE1J3Unz/9RYwX2wmL4Rl7cGxzJ2fcGGqbLOcvyOYyHeCvg71bLo01K9yRs8XK6hvljvVSC4pZc4OAgNiOeu5q1QzC1ppQLqxvcBX6P4hnKz1KNCew4z1iyCEGZkb9+zJGtQAp4XKMu48f6rHemTgGwD7c95TGYA4no/t0K5+tHp/dj9WosZ9NwgQR6RjbhUTkJsIboHQIDXGt1WOhvlNgYCqBQ8CIFlhFRkvXve04/lFXsjpSu3sj+5v7Wp1maRGoqrvjUexCoAhnQ0DyN+T3HNAtP1PIOYRjpkq47Q/sJaiI0bl0YMM/+XibUlWKDqPAFLw1YbRn9kcAQCDU1qu/SzsHt2ls8mEbLD31UT1t/9s2D/68TmlFXzlyuqtKW5CU9IYtlzecjTUnJN82g6eRDNcgW0mjN8PnUBC8bHog2InAKoWv8QpzU4QmCVDGRj6DxnJUAEpP1vepFhf8WW83M4sKaYL2lZFU1TwLj9NN1HvHfvMnPfDWUKufrXjTiXPkdCPPvMy3fT/eGApyz4p4Wbn2LxtqQAtf+B8L7RTKPbZVhiz/J2G79m/6n15TsfBF6+G3F9U/Xls0piUES/0AaWsXFYVP8AAAA=";

@ManagerRegistry.register()
export class AvatarManager extends ManagerBase {
	private AVATAR_DIR = path.join(process.cwd(), "data/avatars");
	private DEFAULT_AVATAR = "default.webp";

	constructor() {
		super();
		this.ensureDirAndDefault();
	}

	private async ensureDirAndDefault() {
		await fs.mkdir(this.AVATAR_DIR, { recursive: true });

		const defaultPath = path.join(this.AVATAR_DIR, this.DEFAULT_AVATAR);
		try {
			await fs.access(defaultPath);
		} catch {
			const buffer = Buffer.from(defaultAvatarBase64, "base64");
			await fs.writeFile(defaultPath, buffer);
		}
	}

	async findAvatarFile(username: string): Promise<string> {
		const filename = `${username}.webp`;
		const fullPath = path.join(this.AVATAR_DIR, filename);

		try {
			await fs.access(fullPath);
			return filename;
		} catch {
			return this.DEFAULT_AVATAR;
		}
	}

	async saveAvatar(username: string, fileBuffer: Buffer, mimetype?: string): Promise<string> {
		const filename = `${username}.webp`;
		const fullPath = path.join(this.AVATAR_DIR, filename);

		try {
			const webpBuffer = await sharp(fileBuffer)
				.webp({ quality: 90 })
				.toBuffer();

			await fs.writeFile(fullPath, webpBuffer);
			return filename;
		} catch (err) {
			console.error("[AvatarManager] Failed to save avatar:", err);
			throw new Error("SAVE_FAILED");
		}
	}

	async renameAvatar(oldname: string, newname: string): Promise<void> {
		const oldPath = path.join(this.AVATAR_DIR, `${oldname}.webp`);
		const newPath = path.join(this.AVATAR_DIR, `${newname}.webp`);

		try {
			await fs.access(oldPath);
			await fs.rename(oldPath, newPath);
		} catch { }
	}

	async removeAvatar(username: string): Promise<void> {
		const filePath = path.join(this.AVATAR_DIR, `${username}.webp`);
		try {
			await fs.unlink(filePath);
		} catch { }
	}

	saveAll() {
		// Not implemented
	}
}
