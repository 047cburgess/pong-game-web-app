import { UserManager, user_id } from "../Managers/UserManager";
import { CommandBase, CommandManager, CommandResult } from "../Managers/CommandManager";
import { AvatarManager } from "../Managers/AvatarManager";
import sharp from "sharp";


export interface AvatarValidationResult {
	success: boolean;
	errors: string[];
}

export interface UploadedFile {
	buffer: Buffer,
	mimetype: string
}

export enum AvatarErrors {
	INVALID_TYPE = "INVALID_TYPE",
	INVALID_DIMENSIONS = "INVALID_DIMENSIONS",
	UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
	USER_NOT_FOUND = "USER_NOT_FOUND",
	SAVE_FAILED = "SAVE_FAILED",
}


@CommandManager.register(UserManager, AvatarManager)
export class UploadAvatarCommand extends CommandBase {

	constructor(
		private userManager: UserManager,
		private avatarManager: AvatarManager
	) { super(); }

	async validateImage(file: UploadedFile): Promise<AvatarValidationResult> {
		const result: AvatarValidationResult = { success: false, errors: [] };

		if (!file || !file.mimetype.startsWith("image/")) {
			result.errors.push(AvatarErrors.INVALID_TYPE);
			return result;
		}

		let metadata;
		try {
			metadata = await sharp(file.buffer).metadata();
		} catch {
			result.errors.push(AvatarErrors.INVALID_TYPE);
			return result;
		}

		if (!metadata.width || !metadata.height || metadata.width > 1024 || metadata.height > 1024) {
			result.errors.push(AvatarErrors.INVALID_DIMENSIONS);
		}

		const allowedFormats = ["jpeg", "png", "webp", "gif"];
		if (!metadata.format || !allowedFormats.includes(metadata.format)) {
			result.errors.push(AvatarErrors.UNSUPPORTED_FORMAT);
		}

		result.success = result.errors.length === 0;
		return result;
	}

	async execute(user_id: user_id, file: UploadedFile): Promise<CommandResult> {
		const result: CommandResult = { success: false, errors: [] };
		const user = this.userManager.getOrLoadUserByID(user_id);
		if (!user) {
			return { success: false, errors: [AvatarErrors.USER_NOT_FOUND] };
		}

		const validation = await this.validateImage(file);
		if (!validation.success) {
			return { success: false, errors: validation.errors };
		}

		try {
			await this.avatarManager.saveAvatar(user.name, file.buffer, file.mimetype);
		} catch {
			return { success: false, errors: [AvatarErrors.SAVE_FAILED] };
		}

		return { success: true, errors: [] };
	}
}
