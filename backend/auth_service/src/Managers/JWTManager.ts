import { IdUtils } from "../Utils/IdUtils";
import { user_id } from "../Interfaces/UserPrivateInfo";
import jwt from "jsonwebtoken";


export class JWTManager {
	private static _instance: JWTManager;
	private static readonly SESSION_MAX_DURATION = 60 * 60 * 24 * 7 * 1000;
	private secret: string;

	private constructor() {
		if (!process.env.SECRET) {
			throw new Error("JWT Secret not set in environment variables");
		}
		this.secret = process.env.SECRET;
	}

	public static getInstance(): JWTManager {
		if (!JWTManager._instance) {
			JWTManager._instance = new JWTManager();
		}
		return JWTManager._instance;
	}

	generateJWT(user_id: user_id): string {
		const timestamp = Date.now();

		const payload = {
			sub: user_id,
			iat: Math.floor(timestamp / 1000),
			exp: Math.floor((timestamp + JWTManager.SESSION_MAX_DURATION) / 1000),
		};

		const token = jwt.sign(payload, this.secret!, { algorithm: "HS256" });
		return token;
	}

	verifyJWT(token: string) : jwt.JwtPayload | null{
		try {
			const decoded = jwt.verify(token, this.secret, { algorithms: ["HS256"] });
			return decoded as jwt.JwtPayload;
		} catch (err) {
			return null;
		}
	}
}