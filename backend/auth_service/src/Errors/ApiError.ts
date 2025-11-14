
export interface ApiErrorDetails {
    status: number; 
    message: string;
    details: string[]; 
}


export class ApiError extends Error {
    public readonly status: number;
    public readonly details: string[];

    constructor(status: number, message: string, details: string | string[] = []) {
        super(message); 

        this.name = 'ApiError';
        this.status = status;
        this.details = Array.isArray(details) ? details : [details];
        Object.setPrototypeOf(this, ApiError.prototype);
    }

    public toResponse(): ApiErrorDetails {
        return {
            status: this.status,
            message: this.message,
            details: this.details,
        };
    }

    public static BadRequest(message: string, details: string | string[]): ApiError {
        return new ApiError(400, message, details);
    }

    public static Unauthorized(message: string, details: string | string[]): ApiError {
        return new ApiError(401, message, details);
    }
    
    public static Forbidden(message: string, details: string | string[]): ApiError {
        return new ApiError(403, message, details);
    }
    
    public static Internal(message: string, details: string | string[] = ['Une erreur interne est survenue.']): ApiError {
        return new ApiError(500, message, details);
    }
}