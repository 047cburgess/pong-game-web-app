"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthManager = void 0;
const MailUtils_1 = require("../Utils/MailUtils");
const PasswordUtils_1 = require("../Utils/PasswordUtils");
const IdUtils_1 = require("../Utils/IdUtils");
const UsernameUtils_1 = require("../Utils/UsernameUtils");
const DbManager_1 = require("./DbManager");
const TwoFAManager_1 = require("./TwoFAManager");
const JWTManager_1 = require("./JWTManager");
const ApiError_1 = require("../Errors/ApiError");
const TwoFactorRequiredError_1 = require("../Errors/TwoFactorRequiredError");
class AuthManager {
    db;
    twoFA;
    jwt_manager;
    static _instance;
    constructor(db = DbManager_1.DbManager.getInstance(undefined), twoFA = TwoFAManager_1.TwoFAManager.getInstance(), jwt_manager = JWTManager_1.JWTManager.getInstance()) {
        this.db = db;
        this.twoFA = twoFA;
        this.jwt_manager = jwt_manager;
    }
    static getInstance() {
        if (!AuthManager._instance) {
            AuthManager._instance = new AuthManager();
        }
        return AuthManager._instance;
    }
    //credential is either mail or username
    async login(credential, password) {
        const user = this.db.getUserByCredential(credential);
        if (!user) {
            throw ApiError_1.ApiError.Unauthorized("AUTHENTIFICATION_FAILED", "Incorrect Username.");
        }
        if (!await PasswordUtils_1.PasswordUtils.compare(password, user.password)) {
            throw ApiError_1.ApiError.Unauthorized("AUTHENTIFICATION_FAILED", "Nom d'utilisateur ou mot de passe incorrect.");
        }
        if (user.TwoFA) {
            const token = this.twoFA.generateAndStoreCode(user.id);
            //this.twoFA.prepareMailData(token, user.email);
            //send mail: ADDED -> uses prepare mail data inside
            await this.twoFA.sendMail(token, user.email);
            throw new TwoFactorRequiredError_1.TwoFactorRequiredError(token.toString());
        }
        const jwt = this.jwt_manager.generateJWT(user.id);
        return jwt;
    }
    login2FA(token, code) {
        const user_id = this.twoFA.testCodeValidity(token, code);
        return this.jwt_manager.generateJWT(user_id);
    }
    validateCredentialsInfo(credentialsInfo) {
        let { username, email, password } = credentialsInfo;
        const validationErrors = [
            ...UsernameUtils_1.UsernameUtils.validateUsername(username).errors,
            ...MailUtils_1.MailUtil.validateEmailAddress(email).errors,
            ...PasswordUtils_1.PasswordUtils.validatePassword(password).errors
        ];
        if (validationErrors.length > 0) {
            throw ApiError_1.ApiError.BadRequest("INVALID_INFORMATIONS", validationErrors);
        }
    }
    async register(credentialsInfo) {
        this.validateCredentialsInfo(credentialsInfo);
        const timestamp = Date.now();
        const credentials = {
            id: IdUtils_1.IdUtils.generateId(timestamp),
            username: credentialsInfo.username,
            email: credentialsInfo.email,
            password: await PasswordUtils_1.PasswordUtils.hash(credentialsInfo.password),
            TwoFA: credentialsInfo.TwoFA || 0
        };
        this.trySaveCredentials(credentials);
        return this.jwt_manager.generateJWT(credentials.id);
    }
    trySaveCredentials(credentialsInfo) {
        try {
            this.db.saveCredentials(credentialsInfo);
        }
        catch (e) {
            if (e.code === 'SQLITE_CONSTRAINT') {
                const conflictDetails = [];
                if (e.message.includes('username')) {
                    conflictDetails.push("USERNAME_ALREADY_IN_USE");
                }
                if (e.message.includes('email')) {
                    conflictDetails.push("EMAIL_ALREADY_IN_USE");
                }
                if (conflictDetails.length > 0) {
                    throw ApiError_1.ApiError.BadRequest("ALREADY_EXIST", conflictDetails);
                }
            }
            throw e;
        }
    }
}
exports.AuthManager = AuthManager;
