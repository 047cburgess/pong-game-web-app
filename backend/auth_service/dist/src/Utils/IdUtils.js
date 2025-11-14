"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdUtils = void 0;
class IdUtils {
    static localnumber = 0;
    static EPOCH = 1735689600000;
    static TIMESTAMP_BITS = 30;
    static RANDOM_ID_BITS = 23;
    static MAX_RANDOM_VALUE = (1 << this.RANDOM_ID_BITS) - 1;
    /*
        53 bits id because we want it to be a number
        Structure: [30 bits Timestamp] [23 bits Random ID]
    */
    static generateId(timestamp) {
        const relativeTimestamp = (timestamp - this.EPOCH) | 0;
        const randomBuffer = require('crypto').randomBytes(3);
        const randomValue = randomBuffer.readUIntBE(0, 3) & this.MAX_RANDOM_VALUE;
        const shiftedTimestamp = relativeTimestamp << this.RANDOM_ID_BITS;
        const snowflakeId = shiftedTimestamp + randomValue;
        return snowflakeId;
    }
    static getCreationDate(id) {
        return Math.floor(id / Math.pow(2, this.RANDOM_ID_BITS)) + this.EPOCH;
    }
}
exports.IdUtils = IdUtils;
