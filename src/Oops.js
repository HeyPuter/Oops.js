class Oops {
    constructor(options = {}) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = options.maxStackSize || Infinity;
        this.isExecuting = false;
        this.changeListeners = new Set();
        this.commandFactories = new Map();
        this.transactionStack = [];
        this.snapshots = new Map();
        this.snapshotInterval = options.snapshotInterval || 10;
        this.compressThreshold = options.compressThreshold || 100;
        this.lastExecutionTime = 0;
        this.mergeWindow = options.mergeWindow || 1000; // in milliseconds
    }

    /**
     * Executes a command and optionally adds it to the undo stack.
     * 
     * @param {Command|string} command - The command to execute. Can be a Command object or a string identifier for a registered command.
     * @param {Object} [options={}] - Execution options.
     * @param {boolean} [options.silent=false] - If true, suppresses notification to listeners after execution.
     * @param {boolean} [options.undoable=true] - If false, the command will not be added to the undo stack.
     * @returns {*} The result of the command execution, if any.
     * @throws {Error} If an unknown command string is provided or if command execution fails.
     * 
     * @description
     * This method performs the following steps:
     * 1. Checks if a command is already being executed to prevent recursion.
     * 2. If the command is a string, it looks up and instantiates the corresponding Command object.
     * 3. Executes the command and captures its result.
     * 4. If undoable, attempts to merge the command with the previous one if conditions are met.
     * 5. If undoable, adds the command to the undo stack and clears the redo stack.
     * 6. If undoable, manages the undo stack size, creates snapshots, and compresses history if necessary.
     * 7. Notifies listeners of the state change unless silent mode is enabled.
     * 
     * @example
     * // Execute a command object (undoable by default)
     * undoRedoManager.execute(new SomeCommand());
     * 
     * // Execute a registered command by name (undoable by default)
     * undoRedoManager.execute('someRegisteredCommand');
     * 
     * // Execute silently (without notifying listeners)
     * undoRedoManager.execute(someCommand, { silent: true });
     * 
     * // Execute non-undoable command
     * undoRedoManager.execute(someCommand, { undoable: false });
     */
    execute(command, options = {}) {
        const { silent = false, undoable = true } = options;

        if (this.isExecuting) return;
        this.isExecuting = true;

        try {
            if (typeof command === 'string') {
                const factory = this.commandFactories.get(command);
                if (!factory) throw new Error(`Unknown command: ${command}`);
                command = factory();
            }

            // Check if there's an active transaction
            if (this.transactionStack.length > 0) {
                // If there is, add the command to the current transaction
                this.transactionStack[this.transactionStack.length - 1].push(command);
                return; // Don't execute the command yet
            }

            const result = command.execute();

            if (undoable) {
                const currentTime = Date.now();
                if (this.undoStack.length > 0 && 
                    currentTime - this.lastExecutionTime < this.mergeWindow &&
                    command.canMerge && 
                    command.canMerge(this.undoStack[this.undoStack.length - 1])) {
                    const mergedCommand = command.merge(this.undoStack.pop());
                    this.undoStack.push(mergedCommand);
                } else {
                    this.undoStack.push(command);
                }

                this.lastExecutionTime = currentTime;
                this.redoStack = [];

                if (this.undoStack.length > this.maxStackSize) {
                    this.undoStack.shift();
                }

                if (this.undoStack.length % this.snapshotInterval === 0) {
                    this.createSnapshot();
                }

                if (this.undoStack.length > this.compressThreshold) {
                    this.compressHistory();
                }
            }

            if (!silent) this.notifyListeners();

            return result;
        } catch (error) {
            console.error("Error executing command:", error);
            throw error;
        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * Undoes a specified number of commands from the undo stack.
     * 
     * @param {number} [steps=1] - The number of commands to undo. Defaults to 1 if not specified.
     * @throws {Error} If an error occurs during the undo operation.
     * 
     * @description
     * This method performs the following steps:
     * 1. Checks if undo operation is possible (not currently executing and undo stack is not empty).
     * 2. Undoes the specified number of commands or as many as possible if fewer are available.
     * 3. Moves undone commands to the redo stack.
     * 4. Notifies listeners of the state change.
     * 5. If an error occurs, attempts to recover from the last valid snapshot.
     * 
     * @example
     * // Undo the last command
     * undoRedoManager.undo();
     * 
     * // Undo the last 3 commands
     * undoRedoManager.undo(3);
     */
    undo(steps = 1) {
        if (this.isExecuting || this.undoStack.length === 0) return;
        this.isExecuting = true;

        try {
            const undoneCommands = [];
            for (let i = 0; i < steps && this.undoStack.length > 0; i++) {
                const command = this.undoStack.pop();
                command.undo();
                undoneCommands.unshift(command);
            }
            this.redoStack.push(...undoneCommands);
            this.notifyListeners();
        } catch (error) {
            console.error("Error undoing command:", error);
            this.recoverFromSnapshot();
        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * Redoes a specified number of commands from the redo stack.
     * 
     * @param {number} [steps=1] - The number of commands to redo. Defaults to 1 if not specified.
     * @throws {Error} If an error occurs during the redo operation.
     * 
     * @description
     * This method performs the following steps:
     * 1. Checks if redo operation is possible (not currently executing and redo stack is not empty).
     * 2. Redoes the specified number of commands or as many as possible if fewer are available.
     * 3. Moves redone commands back to the undo stack.
     * 4. Notifies listeners of the state change.
     * 5. If an error occurs, attempts to recover from the last valid snapshot.
     * 
     * @example
     * // Redo the last undone command
     * undoRedoManager.redo();
     * 
     * // Redo the last 3 undone commands
     * undoRedoManager.redo(3);
     */
    redo(steps = 1) {
        if (this.isExecuting || this.redoStack.length === 0) return;
        this.isExecuting = true;

        try {
            const redoneCommands = [];
            for (let i = 0; i < steps && this.redoStack.length > 0; i++) {
                const command = this.redoStack.pop();
                command.execute();
                redoneCommands.unshift(command);
            }
            this.undoStack.push(...redoneCommands);
            this.notifyListeners();
        } catch (error) {
            console.error("Error redoing command:", error);
            this.recoverFromSnapshot();
        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * Begins a new transaction.
     * 
     * @description
     * This method starts a new transaction by creating an empty array and pushing it onto the transaction stack.
     * Transactions allow grouping multiple commands together to be executed as a single unit.
     * 
     * @example
     * undoRedoManager.beginTransaction();
     * // Execute multiple commands...
     * undoRedoManager.commitTransaction();
     */
    beginTransaction() {
        this.transactionStack.push([]);
    }

    /**
     * Commits the current transaction.
     * 
     * @description
     * This method finalizes the current transaction by popping it off the transaction stack and executing it.
     * If the transaction contains only one command, it's executed directly.
     * If it contains multiple commands, they're wrapped in a CompositeCommand before execution.
     * If the transaction stack is empty, this method does nothing.
     * 
     * @throws {Error} If an error occurs during the execution of the transaction commands.
     * 
     * @example
     * undoRedoManager.beginTransaction();
     * undoRedoManager.execute(command1);
     * undoRedoManager.execute(command2);
     * undoRedoManager.commitTransaction();
     */
    commitTransaction() {
        if (this.transactionStack.length === 0) return;
        const transaction = this.transactionStack.pop();
        if (transaction.length === 1) {
            this.execute(transaction[0]);
        } else if (transaction.length > 1) {
            const compositeCommand = new CompositeCommand(transaction);
            this.execute(compositeCommand);
        }
    }

    /**
     * Aborts the current transaction.
     * 
     * @description
     * This method cancels the current transaction by popping it off the transaction stack and undoing all commands
     * in reverse order. If the transaction stack is empty, this method does nothing.
     * 
     * @throws {Error} If an error occurs while undoing the transaction commands.
     * 
     * @example
     * undoRedoManager.beginTransaction();
     * undoRedoManager.execute(command1);
     * undoRedoManager.execute(command2);
     * undoRedoManager.abortTransaction(); // Undoes command2 and command1
     */
    abortTransaction() {
        if (this.transactionStack.length === 0) return;
        const transaction = this.transactionStack.pop();
        for (let i = transaction.length - 1; i >= 0; i--) {
            transaction[i].undo();
        }
    }

    /**
     * Registers a command factory with a given name.
     * 
     * @param {string} name - The name to associate with the command factory.
     * @param {Function} factory - A function that returns a new instance of the command.
     * 
     * @description
     * This method allows registering command factories by name, enabling the creation of commands
     * using string identifiers. Registered commands can be executed by passing their name to the execute method.
     * 
     * @example
     * undoRedoManager.registerCommand('createUser', () => new CreateUserCommand());
     * undoRedoManager.execute('createUser'); // Creates and executes a new CreateUserCommand
     */
    registerCommand(name, factory) {
        this.commandFactories.set(name, factory);
    }

    /**
     * Creates a snapshot of the current undo and redo stacks.
     * 
     * @description
     * This method creates a serialized snapshot of the current state of the undo and redo stacks.
     * The snapshot is stored in the snapshots Map, indexed by the current size of the undo stack.
     * Snapshots are used for recovery in case of errors during undo or redo operations.
     * 
     * @example
     * undoRedoManager.createSnapshot();
     */
    createSnapshot() {
        const snapshot = {
            undoStack: this.undoStack.map(cmd => cmd.serialize()),
            redoStack: this.redoStack.map(cmd => cmd.serialize())
        };
        this.snapshots.set(this.undoStack.length, snapshot);
    }

    /**
     * Recovers the state from the most recent valid snapshot.
     * 
     * @description
     * This method attempts to recover the undo and redo stacks from the most recent snapshot
     * that is not larger than the current undo stack size. It's typically called after an error
     * occurs during an undo or redo operation to restore the system to a consistent state.
     * After recovery, it notifies all listeners of the state change.
     * 
     * @throws {Error} If deserialization of commands fails.
     * 
     * @example
     * try {
     *     // Some undo/redo operation
     * } catch (error) {
     *     undoRedoManager.recoverFromSnapshot();
     * }
     */
    recoverFromSnapshot() {
        const snapshotKeys = Array.from(this.snapshots.keys()).sort((a, b) => b - a);
        for (const key of snapshotKeys) {
            if (key <= this.undoStack.length) {
                const snapshot = this.snapshots.get(key);
                this.undoStack = snapshot.undoStack.map(cmd => this.deserializeCommand(cmd));
                this.redoStack = snapshot.redoStack.map(cmd => this.deserializeCommand(cmd));
                break;
            }
        }
        this.notifyListeners();
    }

    /**
     * Deserializes a command from its serialized form.
     * 
     * @param {Object} serializedCmd - The serialized command object.
     * @returns {Command} The deserialized command object.
     * 
     * @description
     * This method takes a serialized command object and uses the registered command factories
     * to create a new instance of the command. It's used when recovering from snapshots.
     * 
     * @throws {Error} If the command type is unknown or not registered.
     * 
     * @example
     * const deserializedCmd = undoRedoManager.deserializeCommand({type: 'SomeCommand', data: {...}});
     */
    deserializeCommand(serializedCmd) {
        const factory = this.commandFactories.get(serializedCmd.type);
        if (!factory) throw new Error(`Unknown command type: ${serializedCmd.type}`);
        return factory(serializedCmd.data);
    }

    /**
     * Compresses the undo history by merging compatible commands.
     * 
     * @description
     * This method goes through the undo stack and attempts to merge adjacent commands
     * that are compatible (as determined by their canMerge method). This can help reduce
     * memory usage and simplify the undo/redo history.
     * 
     * @example
     * undoRedoManager.compressHistory();
     */
    compressHistory() {
        const compressedStack = [];
        let currentGroup = null;

        for (const command of this.undoStack) {
            if (currentGroup && currentGroup.canMerge(command)) {
                currentGroup = currentGroup.merge(command);
            } else {
                if (currentGroup) compressedStack.push(currentGroup);
                currentGroup = command;
            }
        }

        if (currentGroup) compressedStack.push(currentGroup);
        this.undoStack = compressedStack;
    }

    /**
     * Adds a change listener to be notified of state changes.
     * 
     * @param {Function} listener - The listener function to be called on state changes.
     * 
     * @description
     * This method adds a listener function to be notified whenever the undo/redo state changes.
     * The listener will receive an object with the current state information.
     * 
     * @example
     * undoRedoManager.addChangeListener((state) => {
     *     console.log('Undo/Redo state changed:', state);
     * });
     */
    addChangeListener(listener) {
        this.changeListeners.add(listener);
    }

    /**
     * Removes a previously added change listener.
     * 
     * @param {Function} listener - The listener function to be removed.
     * 
     * @description
     * This method removes a previously added listener function from the set of change listeners.
     * The listener will no longer be notified of state changes.
     * 
     * @example
     * const listener = (state) => console.log('State changed:', state);
     * undoRedoManager.addChangeListener(listener);
     * // ... later ...
     * undoRedoManager.removeChangeListener(listener);
     */
    removeChangeListener(listener) {
        this.changeListeners.delete(listener);
    }

    /**
     * Notifies all registered listeners of the current state.
     * 
     * @description
     * This method creates a state object with the current undo/redo information
     * and calls all registered listener functions with this state. It's typically
     * called after operations that might change the undo/redo state.
     * 
     * @example
     * // This is usually called internally, but could be used like this:
     * undoRedoManager.execute(someCommand);
     * undoRedoManager.notifyListeners();
     */
    notifyListeners() {
        const state = {
            canUndo: this.canUndo,
            canRedo: this.canRedo,
            undoStackSize: this.undoStack.length,
            redoStackSize: this.redoStack.length
        };
        for (const listener of this.changeListeners) {
            listener(state);
        }
    }

    /**
     * Clears all undo and redo history.
     * 
     * @description
     * This method resets the undo and redo stacks to empty arrays, clears all snapshots,
     * and notifies listeners of the state change. It effectively resets the entire
     * undo/redo system to its initial state.
     * 
     * @example
     * undoRedoManager.clear();
     * console.log(undoRedoManager.canUndo); // false
     * console.log(undoRedoManager.canRedo); // false
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.snapshots.clear();
        this.notifyListeners();
    }

    /**
     * Checks if there are any actions that can be undone.
     * 
     * @returns {boolean} True if there are actions in the undo stack, false otherwise.
     * 
     * @description
     * This getter provides a quick way to check if there are any actions
     * in the undo stack that can be reversed.
     * 
     * @example
     * if (undoRedoManager.canUndo) {
     *     undoButton.enable();
     * } else {
     *     undoButton.disable();
     * }
     */
    get canUndo() {
        return this.undoStack?.length > 0;
    }

    /**
     * Checks if there are any actions that can be redone.
     * 
     * @returns {boolean} True if there are actions in the redo stack, false otherwise.
     * 
     * @description
     * This getter provides a quick way to check if there are any undone actions
     * in the redo stack that can be reapplied.
     * 
     * @example
     * if (undoRedoManager.canRedo) {
     *     redoButton.enable();
     * } else {
     *     redoButton.disable();
     * }
     */
    get canRedo() {
        return this.redoStack?.length > 0;
    }
    
    /**
     * Exports the current state of the undo/redo manager.
     * 
     * @returns {Object} An object representing the serialized state.
     * 
     * @description
     * This method creates a serializable object containing the current state
     * of the undo and redo stacks, as well as any relevant configuration.
     * The returned object can be easily converted to JSON for storage.
     * 
     * @example
     * const state = undoRedoManager.exportState();
     * const jsonState = JSON.stringify(state);
     * // Developer can now save jsonState to file, localStorage, etc.
     */
    exportState() {
        return {
            undoStack: this.undoStack.map(cmd => cmd.serialize()),
            redoStack: this.redoStack.map(cmd => cmd.serialize()),
            maxStackSize: this.maxStackSize,
            snapshotInterval: this.snapshotInterval,
            compressThreshold: this.compressThreshold,
            mergeWindow: this.mergeWindow
        };
    }

    /**
     * Imports a previously exported state into the undo/redo manager.
     * 
     * @param {Object} state - The state object to import.
     * @throws {Error} If the state object is invalid or commands can't be deserialized.
     * 
     * @description
     * This method takes a state object (typically created by exportState)
     * and restores the undo/redo manager to that state. It deserializes
     * the undo and redo stacks and restores configuration settings.
     * 
     * @example
     * // Assuming jsonState is retrieved from storage
     * const state = JSON.parse(jsonState);
     * undoRedoManager.importState(state);
     */
    importState(state) {
        if (!state || typeof state !== 'object') {
            throw new Error('Invalid state object');
        }

        try {
            this.undoStack = state.undoStack.map(cmd => this.deserializeCommand(cmd));
            this.redoStack = state.redoStack.map(cmd => this.deserializeCommand(cmd));
            this.maxStackSize = state.maxStackSize || this.maxStackSize;
            this.snapshotInterval = state.snapshotInterval || this.snapshotInterval;
            this.compressThreshold = state.compressThreshold || this.compressThreshold;
            this.mergeWindow = state.mergeWindow || this.mergeWindow;

            // Reset other internal state
            this.isExecuting = false;
            this.lastExecutionTime = 0;
            this.transactionStack = [];
            this.snapshots.clear();

            this.notifyListeners();
        } catch (error) {
            throw new Error('Failed to import state: ' + error.message);
        }
    }

    /**
     * Serializes the current state to a JSON string.
     * 
     * @returns {string} A JSON string representing the current state.
     * 
     * @description
     * This is a convenience method that exports the state and converts it to a JSON string.
     * 
     * @example
     * const jsonState = undoRedoManager.serializeState();
     * // Developer can now save jsonState to file, localStorage, etc.
     */
    serializeState() {
        return JSON.stringify(this.exportState());
    }

    /**
     * Deserializes a JSON string and imports the state.
     * 
     * @param {string} jsonState - A JSON string representing a previously serialized state.
     * @throws {Error} If the JSON is invalid or state import fails.
     * 
     * @description
     * This is a convenience method that parses a JSON string and imports the resulting state.
     * 
     * @example
     * // Assuming jsonState is retrieved from storage
     * undoRedoManager.deserializeState(jsonState);
     */
    deserializeState(jsonState) {
        try {
            const state = JSON.parse(jsonState);
            this.importState(state);
        } catch (error) {
            throw new Error('Failed to deserialize state: ' + error.message);
        }
    }
}

class CompositeCommand {
    constructor(commands) {
        this.commands = commands;
    }

    execute() {
        for (const command of this.commands) {
            command.execute();
        }
    }

    undo() {
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }

    serialize() {
        return {
            type: 'CompositeCommand',
            data: this.commands.map(cmd => cmd.serialize())
        };
    }

    static deserialize(data, deserializeCommand) {
        return new CompositeCommand(data.map(deserializeCommand));
    }

    canMerge(other) {
        return false; // CompositeCommands typically can't be merged
    }
}

// export default Oops;
module.exports = Oops;