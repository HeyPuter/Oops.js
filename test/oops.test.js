const Oops = require('../src/oops.js');

describe('Oops', () => {
    let undoRedoManager;

    beforeEach(() => {
        undoRedoManager = new Oops();
    });

    test('execute adds command to undo stack', () => {
        const mockCommand = {
            execute: jest.fn(),
            undo: jest.fn(),
            serialize: jest.fn()
        };
        undoRedoManager.execute(mockCommand);
        expect(undoRedoManager.canUndo).toBe(true);
        expect(undoRedoManager.canRedo).toBe(false);
    });

    test('undo moves command from undo to redo stack', () => {
        const mockCommand = {
            execute: jest.fn(),
            undo: jest.fn(),
            serialize: jest.fn()
        };
        undoRedoManager.execute(mockCommand);
        undoRedoManager.undo();
        expect(undoRedoManager.canUndo).toBe(false);
        expect(undoRedoManager.canRedo).toBe(true);
        expect(mockCommand.undo).toHaveBeenCalled();
    });

    test('redo moves command from redo to undo stack', () => {
        const mockCommand = {
            execute: jest.fn(),
            undo: jest.fn(),
            serialize: jest.fn()
        };
        undoRedoManager.execute(mockCommand);
        undoRedoManager.undo();
        undoRedoManager.redo();
        expect(undoRedoManager.canUndo).toBe(true);
        expect(undoRedoManager.canRedo).toBe(false);
        expect(mockCommand.execute).toHaveBeenCalledTimes(2);
    });

    test('clear resets undo and redo stacks', () => {
        const mockCommand = {
            execute: jest.fn(),
            undo: jest.fn(),
            serialize: jest.fn()
        };
        undoRedoManager.execute(mockCommand);
        undoRedoManager.clear();
        expect(undoRedoManager.canUndo).toBe(false);
        expect(undoRedoManager.canRedo).toBe(false);
    });

    test('registerCommand allows execution by string', () => {
        const mockCommand = {
            execute: jest.fn(),
            undo: jest.fn(),
            serialize: jest.fn()
        };
        undoRedoManager.registerCommand('testCommand', () => mockCommand);
        undoRedoManager.execute('testCommand');
        expect(mockCommand.execute).toHaveBeenCalled();
    });

    test('beginTransaction and commitTransaction group commands', () => {
        const mockCommand1 = {
            execute: jest.fn(),
            undo: jest.fn(),
            serialize: jest.fn()
        };
        const mockCommand2 = {
            execute: jest.fn(),
            undo: jest.fn(),
            serialize: jest.fn()
        };
        undoRedoManager.beginTransaction();
        undoRedoManager.execute(mockCommand1);
        undoRedoManager.execute(mockCommand2);
        undoRedoManager.commitTransaction();
        expect(undoRedoManager.canUndo).toBe(true);
        undoRedoManager.undo();
        expect(mockCommand2.undo).toHaveBeenCalled();
        expect(mockCommand1.undo).toHaveBeenCalled();
    });

    test('abortTransaction undoes commands in transaction', () => {
        const mockCommand1 = {
            execute: jest.fn(),
            undo: jest.fn(),
            serialize: jest.fn()
        };
        const mockCommand2 = {
            execute: jest.fn(),
            undo: jest.fn(),
            serialize: jest.fn()
        };
        undoRedoManager.beginTransaction();
        undoRedoManager.execute(mockCommand1);
        undoRedoManager.execute(mockCommand2);
        undoRedoManager.abortTransaction();
        expect(mockCommand2.undo).toHaveBeenCalled();
        expect(mockCommand1.undo).toHaveBeenCalled();
        expect(undoRedoManager.canUndo).toBe(false);
    });

    test('exportState and importState restore system state', () => {
        const mockCommand = {
            execute: jest.fn(),
            undo: jest.fn(),
            serialize: jest.fn().mockReturnValue({ type: 'MockCommand', data: {} })
        };
        undoRedoManager.registerCommand('MockCommand', () => mockCommand);
        undoRedoManager.execute(mockCommand);
        const state = undoRedoManager.exportState();
        const newUndoRedoManager = new Oops();
        newUndoRedoManager.registerCommand('MockCommand', () => mockCommand);
        newUndoRedoManager.importState(state);
        expect(newUndoRedoManager.canUndo).toBe(true);
        expect(newUndoRedoManager.canRedo).toBe(false);
    });

    test('addChangeListener and removeChangeListener manage listeners', () => {
        const listener = jest.fn();
        undoRedoManager.addChangeListener(listener);
        undoRedoManager.execute({ execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() });
        expect(listener).toHaveBeenCalled();
        undoRedoManager.removeChangeListener(listener);
        undoRedoManager.execute({ execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() });
        expect(listener).toHaveBeenCalledTimes(1);
    });

    test('maxStackSize limits the undo stack size', () => {
        const limitedUndoRedoManager = new Oops({ maxStackSize: 2 });
        const mockCommand1 = { execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() };
        const mockCommand2 = { execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() };
        const mockCommand3 = { execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() };

        limitedUndoRedoManager.execute(mockCommand1);
        limitedUndoRedoManager.execute(mockCommand2);
        limitedUndoRedoManager.execute(mockCommand3);

        expect(limitedUndoRedoManager.canUndo).toBe(true);
        limitedUndoRedoManager.undo();
        limitedUndoRedoManager.undo();
        expect(limitedUndoRedoManager.canUndo).toBe(false);
    });

    test('mergeWindow allows merging of commands', () => {
        const mergeableUndoRedoManager = new Oops({ mergeWindow: 100 });
        const mockCommand1 = { 
            execute: jest.fn(), 
            undo: jest.fn(), 
            serialize: jest.fn(),
            canMerge: jest.fn().mockReturnValue(true),
            merge: jest.fn().mockReturnValue({ execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() })
        };
        const mockCommand2 = { 
            execute: jest.fn(), 
            undo: jest.fn(), 
            serialize: jest.fn(),
            canMerge: jest.fn().mockReturnValue(true),
            merge: jest.fn().mockReturnValue({ execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() })
        };

        mergeableUndoRedoManager.execute(mockCommand1);
        jest.advanceTimersByTime(50);
        mergeableUndoRedoManager.execute(mockCommand2);

        expect(mockCommand2.canMerge).toHaveBeenCalledWith(mockCommand1);
        expect(mockCommand2.merge).toHaveBeenCalledWith(mockCommand1);
    });

    test('createSnapshot and recoverFromSnapshot work correctly', () => {
        const mockCommand1 = { 
            execute: jest.fn(), 
            undo: jest.fn(), 
            serialize: jest.fn().mockReturnValue({ type: 'MockCommand', data: {} })
        };
        const mockCommand2 = { 
            execute: jest.fn(), 
            undo: jest.fn(), 
            serialize: jest.fn().mockReturnValue({ type: 'MockCommand', data: {} })
        };
    
        undoRedoManager.registerCommand('MockCommand', (data) => ({ ...mockCommand1, ...data }));
        undoRedoManager.execute(mockCommand1);
        undoRedoManager.createSnapshot();
        undoRedoManager.execute(mockCommand2);
    
        // Mock the snapshot
        undoRedoManager.snapshots = new Map([[1, {
            undoStack: [{ type: 'MockCommand', data: {} }],
            redoStack: []
        }]]);
    
        undoRedoManager.recoverFromSnapshot();
    
        expect(undoRedoManager.canUndo).toBe(true);
        expect(undoRedoManager.canRedo).toBe(false);
        undoRedoManager.undo();
        expect(undoRedoManager.canUndo).toBe(false);
    });

    test('compressHistory merges compatible commands', () => {
        const mockCommand1 = { 
            execute: jest.fn(), 
            undo: jest.fn(), 
            serialize: jest.fn(),
            canMerge: jest.fn().mockReturnValue(true),
            merge: jest.fn().mockReturnValue({ execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() })
        };
        const mockCommand2 = { 
            execute: jest.fn(), 
            undo: jest.fn(), 
            serialize: jest.fn(),
            canMerge: jest.fn().mockReturnValue(true),
            merge: jest.fn().mockReturnValue({ execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() })
        };

        undoRedoManager.execute(mockCommand1);
        undoRedoManager.execute(mockCommand2);
        
        undoRedoManager.compressHistory();

        expect(mockCommand2.canMerge).toHaveBeenCalledWith(mockCommand1);
        expect(mockCommand2.merge).toHaveBeenCalledWith(mockCommand1);
    });

    test('serializeState and deserializeState work correctly', () => {
        const mockCommand = { 
            execute: jest.fn(), 
            undo: jest.fn(), 
            serialize: jest.fn().mockReturnValue({ type: 'MockCommand', data: {} })
        };

        undoRedoManager.registerCommand('MockCommand', () => ({ ...mockCommand }));
        undoRedoManager.execute(mockCommand);

        const serializedState = undoRedoManager.serializeState();
        const newUndoRedoManager = new Oops();
        newUndoRedoManager.registerCommand('MockCommand', () => ({ ...mockCommand }));
        newUndoRedoManager.deserializeState(serializedState);

        expect(newUndoRedoManager.canUndo).toBe(true);
        expect(newUndoRedoManager.canRedo).toBe(false);
    });

    test('execute handles errors gracefully', () => {
        const errorCommand = {
            execute: jest.fn().mockImplementation(() => { throw new Error('Execution failed'); }),
            undo: jest.fn(),
            serialize: jest.fn()
        };

        expect(() => undoRedoManager.execute(errorCommand)).toThrow('Execution failed');
        expect(undoRedoManager.canUndo).toBe(false);
    });

    test('undo and redo handle errors gracefully', () => {
        const errorCommand = {
            execute: jest.fn(),
            undo: jest.fn().mockImplementation(() => { throw new Error('Undo failed'); }),
            serialize: jest.fn().mockReturnValue({ type: 'ErrorCommand', data: {} })
        };

        undoRedoManager.registerCommand('ErrorCommand', () => ({ ...errorCommand }));
        undoRedoManager.execute(errorCommand);

        console.error = jest.fn(); // Mock console.error
        undoRedoManager.undo();
        expect(console.error).toHaveBeenCalled();
        expect(undoRedoManager.canUndo).toBe(false);
    });

    test('transactions can be nested', () => {
        const mockCommand1 = { execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() };
        const mockCommand2 = { execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() };
        const mockCommand3 = { execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() };

        undoRedoManager.beginTransaction();
        undoRedoManager.execute(mockCommand1);
        undoRedoManager.beginTransaction();
        undoRedoManager.execute(mockCommand2);
        undoRedoManager.commitTransaction();
        undoRedoManager.execute(mockCommand3);
        undoRedoManager.commitTransaction();

        expect(undoRedoManager.canUndo).toBe(true);
        undoRedoManager.undo();
        expect(mockCommand3.undo).toHaveBeenCalled();
        expect(mockCommand2.undo).toHaveBeenCalled();
        expect(mockCommand1.undo).toHaveBeenCalled();
    });

    test('snapshotInterval creates snapshots at regular intervals', () => {
        const snapshotUndoRedoManager = new Oops({ snapshotInterval: 2 });
        const mockCommand = { execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() };
        
        snapshotUndoRedoManager.createSnapshot = jest.fn();
        
        snapshotUndoRedoManager.execute(mockCommand);
        expect(snapshotUndoRedoManager.createSnapshot).not.toHaveBeenCalled();
        
        snapshotUndoRedoManager.execute(mockCommand);
        expect(snapshotUndoRedoManager.createSnapshot).toHaveBeenCalledTimes(1);
        
        snapshotUndoRedoManager.execute(mockCommand);
        expect(snapshotUndoRedoManager.createSnapshot).toHaveBeenCalledTimes(1);
        
        snapshotUndoRedoManager.execute(mockCommand);
        expect(snapshotUndoRedoManager.createSnapshot).toHaveBeenCalledTimes(2);
    });

    test('silent execution does not notify listeners', () => {
        const listener = jest.fn();
        undoRedoManager.addChangeListener(listener);
        
        const mockCommand = { execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() };
        
        undoRedoManager.execute(mockCommand, { silent: true });
        expect(listener).not.toHaveBeenCalled();
        
        undoRedoManager.execute(mockCommand);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    test('non-undoable execution does not add to undo stack', () => {
        const mockCommand = { execute: jest.fn(), undo: jest.fn(), serialize: jest.fn() };
        
        undoRedoManager.execute(mockCommand, { undoable: false });
        expect(undoRedoManager.canUndo).toBe(false);
        
        undoRedoManager.execute(mockCommand);
        expect(undoRedoManager.canUndo).toBe(true);
    });

    test('execute cleans up after error', () => {
        const errorCommand = {
            execute: jest.fn().mockImplementation(() => { throw new Error('Execution failed'); }),
            undo: jest.fn(),
            serialize: jest.fn()
        };
    
        expect(() => undoRedoManager.execute(errorCommand)).toThrow('Execution failed');
        expect(undoRedoManager.isExecuting).toBe(false);
    });
});