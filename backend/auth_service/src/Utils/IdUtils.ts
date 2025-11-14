export class IdUtils {
	private static localnumber = 0;

	private static readonly EPOCH = 1735689600000;

	private static readonly TIMESTAMP_BITS = 30;
	private static readonly RANDOM_ID_BITS = 23;

	private static readonly MAX_RANDOM_VALUE = (1 << this.RANDOM_ID_BITS) - 1;

	/*
		53 bits id because we want it to be a number
		Structure: [30 bits Timestamp] [23 bits Random ID]
	*/
	static generateId(timestamp: number): number {
		const relativeTimestamp = (timestamp - this.EPOCH) | 0;

		const randomBuffer = require('crypto').randomBytes(3);
		const randomValue = randomBuffer.readUIntBE(0, 3) & this.MAX_RANDOM_VALUE;

		const shiftedTimestamp = relativeTimestamp << this.RANDOM_ID_BITS;

		const snowflakeId = shiftedTimestamp + randomValue;
		return snowflakeId;
	}

	static getCreationDate(id: number): number {
		return Math.floor(id / Math.pow(2, this.RANDOM_ID_BITS)) + this.EPOCH;
	}
}