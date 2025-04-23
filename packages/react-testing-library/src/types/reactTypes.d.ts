// The subset of a Thenable required by things thrown by Suspense.

import React from "@rbxts/react";

// This doesn't require a value to be passed to either handler.
export interface Wakeable {
	then(onFulfill: () => any, onReject: () => any): void | Wakeable;
}

// The subset of a Promise that React APIs rely on. This resolves a value.
// This doesn't require a return value neither from the handler nor the
// then function.
interface ThenableImpl<T> {
	then(onFulfill: (value: T) => any, onReject: (error: any) => any): void | Wakeable;
}
interface UntrackedThenable<T> extends ThenableImpl<T> {
	status?: void;
	_debugInfo?: undefined;
}

export interface PendingThenable<T> extends ThenableImpl<T> {
	status: "pending";
	_debugInfo?: undefined;
}

export interface FulfilledThenable<T> extends ThenableImpl<T> {
	status: "fulfilled";
	value: T;
	_debugInfo?: undefined;
}

export interface RejectedThenable<T> extends ThenableImpl<T> {
	status: "rejected";
	reason: any;
	_debugInfo?: undefined;
}

export type Thenable<T> =
	| UntrackedThenable<T>
	| PendingThenable<T>
	| FulfilledThenable<T>
	| RejectedThenable<T>;

export type StartTransitionOptions = {
	name?: string;
};

export type Usable<T> = Thenable<T> | React.Context<T>;
