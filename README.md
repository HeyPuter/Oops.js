<h3 align="center"><img width="300" alt="KV.JS logo" src="https://assets.puter.site/oops.js.webp?a=1"></h3>
<h3 align="center">Oops.js: Advanced Undo/Redo Manager</h3>

<br>

<p align="center">
    <a href="https://puter.com">Puter.com</a>
    ·
    <a href="https://discord.com/invite/PQcx7Teh8u">Discord</a>
    ·
    <a href="https://reddit.com/r/puter">Reddit</a>
    ·
    <a href="https://twitter.com/HeyPuter">X (Twitter)</a>
</p>



<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-green.svg)

</div>

<br>

# Oops.js

With Oops.js, you can implement undo/redo capabilities for your apps on par with industry-leading software like Figma, Photoshop, and Visual Studio Code. Whether you're building a simple text editor or a complex graphic design application, Oops.js offers the tools you need to create an intuitive yet powerful undo/redo functionality for your application.


<br>

# Features

Oops.js provides a robust implementation of the command pattern, allowing you to easily add advanced undo and redo functionality to your projects with these powerful features:

- **Command Pattern:** Implements the command pattern for easy extensibility and operation encapsulation.
- **Transaction Support:** Allows grouping multiple commands into a single, atomic operation.
- **Automatic Command Merging:** Intelligently merges commands executed within a specified time window.
- **Snapshot System:** Creates and recovers from snapshots for enhanced error handling and state preservation.
- **History Compression:** Optimizes memory usage by compressing the command history when it exceeds a threshold.
- **Custom Command Registration:** Supports registration of custom commands for application-specific operations.
- **Event Notification System:** Provides a robust event system for state change notifications.
- **State Serialization:** Enables serialization and deserialization of the entire undo/redo state for persistence.
- **Configurable Parameters:** Offers customizable stack size, snapshot interval, and compression threshold.
- **Composite Commands:** Supports complex operations through composite command structures.
- **Error Recovery:** Implements sophisticated error handling and recovery mechanisms.
- **UI Integration:** Easily integrates with UI components through `canUndo` and `canRedo` properties.
- **Dual Execution Modes:** Supports both object-based and string-based command execution for flexibility.

<br>

## Installation

### npm

To install Oops.js using npm, run the following command in your project directory:

```bash
npm install oops-js
```

Then, you can import it in your JavaScript file:

```js
import Oops from 'oops.js';
```

<br>

### Using CDN

To use Oops.js directly in your HTML file via CDN, add the following script tag to your HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/oops.js@latest/dist/oops.min.js"></script>
```

This will make the `Oops` class available globally in your JavaScript code.

<br>


### Building from Source

To build Oops.js from source, run the following commands:

```bash
git clone https://github.com/heyputer/oops.js.git
cd oops.js
npm install
npm run build
```


<br>

### Example

```js
// Create an instance of Oops
const undoManager = new Oops();

// Define a simple command
class AddNumberCommand {
    constructor(number) {
        this.number = number;
        this.previousTotal = 0;
    }

    execute() {
        this.previousTotal = total;
        total += this.number;
    }

    undo() {
        total = this.previousTotal;
    }
}

// Use the undo manager
let total = 0;

undoManager.execute(new AddNumberCommand(5));
console.log(total); // Output: 5

undoManager.execute(new AddNumberCommand(3));
console.log(total); // Output: 8

undoManager.undo();
console.log(total); // Output: 5

undoManager.redo();
console.log(total); // Output: 8
```

<br>

# API Documentation

## `Oops` Class
### Constructor

```js
new Oops(options)
```

Creates a new instance of the `Oops` undo/redo manager.

- `options` (Object, optional):
    - `maxStackSize` (Number): Maximum size of the undo/redo stacks. Default is Infinity.
    - `snapshotInterval` (Number): Interval at which to create snapshots. Default is 10.
    - `compressThreshold` (Number): Threshold for compressing history. Default is 100.
    - `mergeWindow` (Number): Time window in milliseconds for merging commands. Default is 1000.

<br>

### Methods

##### `execute(command, options)`

Executes a command and optionally adds it to the undo stack.

- `command` (Command|string): The command to execute. Can be a Command object or a string identifier for a registered command.
- `options` (Object, optional):
    - `silent` (boolean): If true, suppresses notification to listeners after execution. Default is `false`.
    - `undoable` (boolean): If false, the command will not be added to the undo stack. Default is `true`.

Returns the result of the command execution, if any.

##### `undo(steps)`

Undoes a specified number of commands from the undo stack.

- `steps` (Number, optional): The number of commands to undo. Default is 1.

##### `redo(steps)`

Redoes a specified number of commands from the redo stack.

- `steps` (Number, optional): The number of commands to redo. Default is 1.

##### `beginTransaction()`

Begins a new transaction, allowing grouping of multiple commands.

##### `commitTransaction()`

Commits the current transaction, executing all commands in the transaction as a single unit.

##### `abortTransaction()`

Aborts the current transaction, undoing all commands in the transaction.

##### `registerCommand(name, factory)`

Registers a command factory with a given name.

- `name` (String): The name to associate with the command factory.
- `factory` (Function): A function that returns a new instance of the command.

##### `addChangeListener(listener)`

Adds a change listener to be notified of state changes.

- `listener` (Function): The listener function to be called on state changes.

##### `removeChangeListener(listener)`

Removes a previously added change listener.

- `listener` (Function): The listener function to be removed.

##### `clear()`

Clears all undo and redo history.

##### `exportState()`

Exports the current state of the undo/redo manager.
Returns an object representing the serialized state.

##### `importState(state)`

Imports a previously exported state into the undo/redo manager.

- `state` (Object): The state object to import.

##### `serializeState()`

Serializes the current state to a JSON string.
Returns a JSON string representing the current state.

##### `deserializeState(jsonState)`

Deserializes a JSON string and imports the state.

- `jsonState` (string): A JSON string representing a previously serialized state.

<br>

### Properties
##### `canUndo`
A boolean indicating whether there are any actions that can be undone.

##### `canRedo`
A boolean indicating whether there are any actions that can be redone.

<br>

## `CompositeCommand` Class

The `CompositeCommand` class represents a command that consists of multiple sub-commands. It allows you to group several commands together and treat them as a single command.

### Constructor

```js
new CompositeCommand(commands)
```

Creates a new instance of the `CompositeCommand` class.

- `commands` (Array): An array of `Command` objects to be executed as part of this composite command.

<br>

### Methods

##### `execute()`
Executes all the commands in the composite command in the order they were added.

##### `undo()`
Undoes all the commands in the composite command in reverse order.

##### `serialize()`

Serializes the `CompositeCommand` for storage or transmission.

Returns:

An object with the following structure:

- `type` (string): Always '`CompositeCommand`'.
- `data` (Array): An array of serialized sub-commands.


##### `static deserialize(data, deserializeCommand)`
Static method to deserialize a `CompositeCommand`.

`data` (Array): An array of serialized sub-commands.
`deserializeCommand` (Function): A function to deserialize individual commands.

Returns:

A new `CompositeCommand` instance.

##### `canMerge(other)`
Checks if this `CompositeCommand` can be merged with another command.

`other` (Command): Another command to check for merge compatibility.

Returns:

`false`: CompositeCommands typically can't be merged.


<br>


# LICENSE

Distributed under the MIT License. See `LICENSE.txt` for more information.
