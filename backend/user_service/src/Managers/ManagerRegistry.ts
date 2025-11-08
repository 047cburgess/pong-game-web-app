import { ManagerBase } from "./CommandManager";

type AnyManagerConstructor = abstract new (...args: any[]) => ManagerBase;

export class ManagerRegistry {
	private managers = new Map<typeof ManagerBase, InstanceType<typeof ManagerBase>>();
	static registeredManagers: {
		Manager: typeof ManagerBase;
		deps: typeof ManagerBase[];
	}[] = [];

	constructor() {
		this.instantiateManagers();
	}

	private instantiateManagers() {
		for (const { Manager, deps } of ManagerRegistry.registeredManagers) {
			const instances = deps.map(dep => this.get(dep));
			const instance = new (Manager as any)(...instances);
			this.managers.set(Manager, instance);
		}
	}

	static register = (...deps: AnyManagerConstructor[]) => {
		return function (Manager: AnyManagerConstructor) {
			if (ManagerRegistry.registeredManagers.some(m => m.Manager === Manager))
				throw new Error(`Manager ${Manager.name} already registered`);
			ManagerRegistry.registeredManagers.push({ Manager, deps });
		};
	};

	get<T extends typeof ManagerBase>(Manager: T): InstanceType<T> {
		const existing = this.managers.get(Manager) as InstanceType<T> | undefined;
		if (existing) return existing;

		// Fallback si instanciation tardive
		const meta = ManagerRegistry.registeredManagers.find(m => m.Manager === Manager);
		if (!meta) throw new Error(`Manager not registered: ${Manager.name}`);
		const deps = meta.deps.map(dep => this.get(dep));
		const instance = new (Manager as any)(...deps);
		this.managers.set(Manager, instance);
		return instance;
	}
}