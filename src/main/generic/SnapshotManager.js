/**
 * Defines the functionality needed for handling snapshots.
 * @abstract
 */
class SnapshotManager {
    constructor() {
        this._snapshots = new Set();
    }

    /**
     * Creates an in-memory snapshot of the current state.
     * This snapshot only maintains the differences between the state at the time of the snapshot
     * and the current state.
     * To stop maintaining the snapshot, it has to be aborted.
     * @param {ObjectStore} objectStore
     * @param {IObjectStore} backend
     * @returns {Snapshot}
     */
    createSnapshot(objectStore, backend) {
        const snapshot = new Snapshot(objectStore, backend);
        this._snapshots.add(snapshot);
        return snapshot;
    }


    /**
     * Aborts a snapshot.
     * @param {Snapshot} snapshot
     * @returns {boolean} A promise of the success outcome.
     */
    abortSnapshot(snapshot) {
        return this._snapshots.delete(snapshot);
    }

    /**
     * Internally applies a transaction to the transaction's state.
     * This needs to be done in batch (as a db level transaction), i.e., either the full state is updated
     * or no changes are applied.
     * @param {Transaction} tx The transaction to apply.
     * @returns {Promise} The promise resolves after applying the transaction.
     */
    async applyTx(tx) {
        if (!(tx instanceof Transaction)) {
            throw 'Can only apply transactions';
        }

        // First handle snapshots:
        // - Apply tx to own snapshots.
        // - Take over new snapshots.
        const applications = [];
        for (const snapshot of this._snapshots) {
            applications.push(snapshot._apply(tx));
        }
        for (const snapshot of tx._snapshotManager) {
            snapshot._backend = this;
            this._snapshots.add(snapshot);
        }
        return Promise.all(applications);
    }

    /**
     * Returns an iterator over the snapshots.
     * @returns {Iterator.<Snapshot>}
     */
    [Symbol.iterator]() {
        return this._snapshots.values();
    }
}
Class.register(SnapshotManager);
