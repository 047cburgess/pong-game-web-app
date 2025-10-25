import { ManagerRegistry } from "../ManagerRegistry";

export interface CommandResult<T = void>{
	success : boolean;
	errors : string[];
	data? : T;
}

export abstract class CommandBase {
	constructor() { }
	abstract execute(...args: any[]): any;
}

export abstract class ManagerBase {
	constructor() {}
	abstract saveAll() : any;
}
type AnyManagerConstructor = abstract new (...args: any[]) => ManagerBase;


type CommandCtorAcceptingManagers<T extends typeof CommandBase = typeof CommandBase> =
	new (...args: InstanceType<typeof ManagerBase>[]) => InstanceType<T>;

type AnyCommandConstructor = new (...args: any[]) => CommandBase;

export class CommandManager {

	private static commands = new Map<AnyCommandConstructor, InstanceType<AnyCommandConstructor>>();

	static registeredCommands: {
		Command: AnyCommandConstructor;
		deps: AnyManagerConstructor[];
	}[] = [];

	constructor(private managerRegistry: ManagerRegistry) {
		this.registerCommands();
	}

	private registerCommands() {
		for (const { Command, deps } of CommandManager.registeredCommands) {
			const instances = deps.map(dep => this.managerRegistry.get(dep)) as InstanceType<AnyManagerConstructor>[];
			const command = new (Command as CommandCtorAcceptingManagers)(...instances);
			CommandManager.commands.set(Command, command);
		}
	}

	static register = (...deps: AnyManagerConstructor[]) => {
		return function (Command: AnyCommandConstructor) {
			if (CommandManager.registeredCommands.some(c => c.Command === Command))
				throw new Error(`Command ${Command.name} already registered`);
			CommandManager.registeredCommands.push({ Command, deps });
		};
	};

	static get<T extends AnyCommandConstructor>(Command: T): InstanceType<T> {
		const instance = this.commands.get(Command) as InstanceType<T> | undefined;
		if (!instance) throw new Error(`Command not found: ${Command.name}`);
		return instance;
	}
}
/*
	TODO :
	changer toute la logique, 
	pour l'instant c'est fait sur mesure pour ManagerRegistry
	tout doit etre repenser en fonction de la maniere dont je fais evoluer
	l'architecture 


*/



/*
	private registerCommands() {

		const registerSingleCommand = <T extends CommandBase>(
			CommandCls: T,
			...deps: typeof ManagerBase[]
		) => {
			const instances : InstanceType<typeof ManagerBase>[] = deps.map(dep => this.ManagerRegistry.get(dep));
			const command = new (CommandCls as CommandCtorAcceptingManagers)(...instances);
			this.commands.set(CommandCls, command as InstanceType<T>);
		};

		registerSingleCommand(ChangeUsernameCommand, UserCoreManager);
		registerSingleCommand(ChangePasswordCommand, UserCoreManager);
		registerSingleCommand(
			RegisterUserCommand,
			UserCoreManager,
			UserConfigManager,
			UserStatsManager,
			UserUnlocksManager
		);
	}
*/