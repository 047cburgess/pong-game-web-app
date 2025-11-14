export interface Result<T = void> {
	success: boolean;
	errors: string[];
	data? : T
}