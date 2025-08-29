interface MailboxItem<T> {
	value: T;
	next: MailboxItem<T> | undefined;
}

export class Mailbox<T> {
	private _active: boolean = false;
	private _current: MailboxItem<T> | undefined = undefined;
	private _last: MailboxItem<T> | undefined = undefined;

	constructor(private _process: (ev: T) => void) {}

	public start() {
		this._active = true;
		this.flush();
	}

	public clear(): void {
		// we can't set _current to undefined because we might be currently processing
		// and enqueue following clear shouldn't start processing the enqueued item immediately
		if (this._current) {
			this._current.next = undefined;
			this._last = this._current;
		}
	}

	public enqueue(event: T): void {
		const enqueued = {
			value: event,
			next: undefined,
		};

		if (this._current) {
			this._last!.next = enqueued;
			this._last = enqueued;
			return;
		}

		this._current = enqueued;
		this._last = enqueued;

		if (this._active) {
			this.flush();
		}
	}

	private flush() {
		while (this._current) {
			// atm the given _process is responsible for implementing proper try/catch handling
			// we assume here that this won't throw in a way that can affect this mailbox
			const consumed = this._current;
			this._process(consumed.value);
			this._current = consumed.next;
		}
		this._last = undefined;
	}
}
