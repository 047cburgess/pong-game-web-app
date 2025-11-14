import { ManagerRegistry } from "./ManagerRegistry";
import "reflect-metadata";

export interface CommandResult<T = void> {
	success: boolean;
	errors: string[];
	data?: T;
}

export abstract class CommandBase {
	constructor() { }
	abstract execute(...args: any[]): any;
}

export abstract class ManagerBase {
	constructor() { }
	abstract saveAll(): any;
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
			const paramTypes = Reflect.getMetadata("design:paramtypes", Command) as any[] || [];
			if (paramTypes.length !== deps.length) {
				throw new Error(
					`Command ${Command.name} constructor expects ${paramTypes.length} manager(s), ` +
					`but ${deps.length} provided in registration`
				);
			}

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
