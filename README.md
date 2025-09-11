# @rbxts/xstate

This project provides a port of the [XState](https://stately.ai/docs) library using roblox-ts.

## Packages

- **@xstate/core**: Fully ported and tested. Provides the core XState functionality for defining and managing state machines.
- **@xstate/react**: Fully ported and tested. Offers React hooks and utilities for integrating state machines with React.
- **@xstate/test**: Ported but untested. Provides utilities for testing your state machines.

## Deviations and Limitations

The following features of the original XState library are not yet fully supported:

- **RxJS Related Features:** Features that depend on RxJS observables are not yet supported.
- **Browser Related Features:** Browser-specific features (e.g., interacting with the DOM) are not applicable in the Roblox environment.
- **JSON and Inspection Features:** Support for JSON serialization/deserialization and inspection tools is incomplete.

## Transformer

Due to differences between JavaScript object ordering and Lua table ordering, you may need to use a custom TypeScript transformer [`rbxts-transformer-xstate`](https://github.com/lisachandra/rbxts-transformer-xstate). This transformer automatically adds `_order_` keys to state nodes in your machine definitions.
