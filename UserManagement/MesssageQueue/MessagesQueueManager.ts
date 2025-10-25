import { ManagerBase } from "../Commands/CommandManager";
import { ManagerRegistry } from "../ManagerRegistry";
import { user_id } from "../UserData/User";

export interface Messages {
    type: string;
	data?: any;
    //will add more data like frienddata that changed etc...
}

@ManagerRegistry.register()
export class MessagesQueueManager extends ManagerBase {

    private usersNotifQueues: Map<user_id, Messages[]> = new Map();

    constructor() {
        super();
    }

    // ---------------- Queue Management ----------------

    push(userId: user_id, notif: Messages) {
        if (!this.usersNotifQueues.has(userId)) {
            this.usersNotifQueues.set(userId, []);
        }
        this.usersNotifQueues.get(userId)!.push(notif);
    }

    fetch(userId: user_id): Messages[] {
        const queue = this.usersNotifQueues.get(userId) ?? [];
        this.usersNotifQueues.set(userId, []); // vider après fetch
        return queue;
    }

    hasNotifications(userId: user_id): boolean {
        const queue = this.usersNotifQueues.get(userId);
        return !!queue && queue.length > 0;
    }

    // ---------------- Persistence ----------------


     saveAll() {
		//herited but not implemented, probably should change the abstract class i use
    }

    clear(userId: user_id) {
        this.usersNotifQueues.delete(userId);
    }
}
