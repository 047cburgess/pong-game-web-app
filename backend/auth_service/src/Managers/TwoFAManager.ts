import { setTimeout, clearTimeout } from 'timers';
import * as crypto from 'crypto';
import { IdUtils } from '../Utils/IdUtils';
import nodemailer from 'nodemailer';

interface CodeEntry {
	id: number,
	code: string;
	timeoutId: NodeJS.Timeout;
}

export class TwoFAManager {
	private static _instance: TwoFAManager;
	private activeCodes: Map<number, CodeEntry> = new Map();
	private activeTimeouts: Set<NodeJS.Timeout> = new Set();
	private transporter: nodemailer.Transporter;

	private readonly CODE_VALIDITY_MS = 5 * 60 * 1000;

	constructor() { 
		//ADD
		this.transporter = nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port: parseInt(process.env.SMTP_PORT || '587'),
			secure: process.env.SMTP_PORT === '465',
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASSWORD,
			},
		});
	}

	public static getInstance(): TwoFAManager {
		if (!TwoFAManager._instance) {
			TwoFAManager._instance = new TwoFAManager();
		}
		return TwoFAManager._instance;
	}

	private generateCode(): string {
		const min = 0;
		const max = 999999;

		const code = crypto.randomInt(min, max + 1);

		return code.toString().padStart(6, '0');
	}

	private setupExpiration(user_id: number, code: string): number {
		const token = IdUtils.generateId(Date.now());
		const timeout = setTimeout(() => {
			if (this.activeCodes.get(token)?.code === code) {
				this.activeCodes.delete(token);
				console.log(`2FA code for user ${user_id} expired and removed.`);
			}
			this.activeTimeouts.delete(timeout);
		}, this.CODE_VALIDITY_MS);
		this.activeTimeouts.add(timeout);
		this.activeCodes.set(token, { id: user_id, code, timeoutId: timeout });
		return token;
	}

	public generateAndStoreCode(id: number): number {
		const newCode = this.generateCode();
		const token = this.setupExpiration(id, newCode);

		return token;
	}

	public getCode(token: number): string | null {
		return this.activeCodes.get(token)?.code || null;
	}

	public getUserId(token: number): number | null {
		return this.activeCodes.get(token)?.id || null;
	}

	public testCodeValidity(token: number, userCode: string): number {
		const entry = this.activeCodes.get(token);
		if (!entry) { throw new Error("INVALID2FA_TOKEN"); }
		if (entry.code !== userCode) { throw new Error("INVALID2FA_CODE"); }
		const user_id = entry.id;

		clearTimeout(entry.timeoutId);
		this.activeTimeouts.delete(entry.timeoutId);
		this.activeCodes.delete(token);

		return user_id;
	}

	public regenerateCode(token: number): number {
		const existingEntry = this.activeCodes.get(token);

		if (!existingEntry) {
			throw new Error("Cannot regenerate code: Token not found or expired.");
		}

		clearTimeout(existingEntry.timeoutId);
		this.activeTimeouts.delete(existingEntry.timeoutId);
		this.activeCodes.delete(token);

		const newCode = this.generateCode();

		return this.setupExpiration(existingEntry.id, newCode);
	}

	public prepareMailData(token: number, recipientEmail: string): { to: string, subject: string, htmlBody: string } | null {
		const code = this.getCode(token);

		if (!code) { return null; } //should never happen

		const subject = "Your Two-Factor Authentication Code";
		const htmlBody = `
            <html>
                <body>
                    <h1>Hello!</h1>
                    <p>Your one-time login code is:</p>
                    <h2 style="color: #4CAF50; background-color: #f0f0f0; padding: 10px; display: inline-block; border-radius: 5px;">${code}</h2>
                    <p>This code is valid for ${this.CODE_VALIDITY_MS / 60000} minutes.</p>
                    <p>If you did not request this code, please ignore this email.</p>
                    <p>Sincerely,</p>
                    <p>The Support Team</p>
                </body>
            </html>
        `;

		return {
			to: recipientEmail,
			subject: subject,
			htmlBody: htmlBody
		};
	}

	public async sendMail(token: number, recipientEmail: string): Promise<void> {
		const mailData = this.prepareMailData(token, recipientEmail);

		if (!mailData) {
			throw new Error("Cannot send mail: Invalid token of code expired."); // TODO: the integrated error handler
		}

		try {
			await this.transporter.sendMail({
				from: process.env.SMTP_FROM || '"No Reply" <noreply@ft_transcendence.com>',
				to: mailData.to,
				subject: mailData.subject,
				html: mailData.htmlBody,
			});

			console.log(`2FA mail sent successfully to ${recipientEmail}`);
		} catch (error) {
			console.error("Failed to send 2FA email:", error);
			throw new Error("Failed to send 2FA email. Please try again.");
		}
	}

	public closeAllIntervals(): void {
		console.log(`Shutting down 2FAManager: Clearing ${this.activeTimeouts.size} active intervals.`);
		this.activeTimeouts.forEach(timeout => {
			clearTimeout(timeout);
		});
		this.activeTimeouts.clear();
		this.activeCodes.clear();
	}
}
