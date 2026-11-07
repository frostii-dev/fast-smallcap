/**
 * IndexedDB wrapper for Fast SmallCaps persistence.
 *
 * Stores document data (original content, converted content, file info) in an
 * IndexedDB object store, with a versioned schema to support future migrations.
 * localStorage is used for lightweight settings (protection config, auto-convert,
 * editor preferences) via existing helpers.
 *
 * All IndexedDB operations degrade gracefully: if IndexedDB is unavailable or
 * any operation fails, the app continues to work without persistence for that
 * piece of data. Errors are logged to the console but never crash the app.
 */

const DB_NAME = "fast-smallcap";
const DB_VERSION = 1;
const STORE_NAME = "documents";

export const STORAGE_VERSION = DB_VERSION;

/**
 * Shape of a document record stored in IndexedDB.
 */
export interface StoredDocument {
	id: number;
	name: string;
	format: string;
	content: string;
	output: string;
	updatedAt: number;
}

/**
 * Open (or create) the IndexedDB database with a versioned schema.
 * Returns null if IndexedDB is unavailable or opening fails.
 */
function openDB(): Promise<IDBDatabase | null> {
	if (typeof indexedDB === "undefined") {
		return Promise.resolve(null);
	}

	return new Promise<IDBDatabase | null>((resolve) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result as IDBDatabase;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, {
					keyPath: "id",
					autoIncrement: true,
				});
				store.createIndex("name", "name", { unique: false });
				store.createIndex("updatedAt", "updatedAt", { unique: false });
			}
		};

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onerror = () => {
			console.warn("[fast-smallcap] IndexedDB open failed:", request.error);
			resolve(null);
		};

		request.onblocked = () => {
			console.warn(
				"[fast-smallcap] IndexedDB open blocked by another connection"
			);
			resolve(null);
		};
	});
}

/**
 * Get the most recently updated document from the store.
 * Returns null if no document exists or IndexedDB is unavailable.
 */
export async function getStoredDocument(): Promise<StoredDocument | null> {
	const db = await openDB();
	if (!db) {
		return null;
	}

	return new Promise<StoredDocument | null>((resolve) => {
		const tx = db.transaction(STORE_NAME, "readonly");
		const store = tx.objectStore(STORE_NAME);
		const index = store.index("updatedAt");
		const request = index.getAll(IDBKeyRange.upperBound(Date.now()));

		request.onsuccess = () => {
			const docs: StoredDocument[] = request.result;
			db.close();
			resolve(docs.length > 0 ? docs[docs.length - 1] : null);
		};

		request.onerror = () => {
			console.warn("[fast-smallcap] IndexedDB get failed:", request.error);
			db.close();
			resolve(null);
		};

		tx.oncomplete = () => {
			db.close();
		};
	});
}

/**
 * Save (upsert) a document record. If a document with the same name exists,
 * it is updated; otherwise a new record is inserted.
 * Returns null if IndexedDB is unavailable or the write fails.
 */
export async function saveDocument(
	doc: Partial<StoredDocument>
): Promise<void> {
	const db = await openDB();
	if (!db) {
		return;
	}

	const record: Partial<StoredDocument> = {
		...doc,
		updatedAt: Date.now(),
	};

	return new Promise<void>((resolve) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);

		if (!record.name) {
			store.add(record as StoredDocument);
			tx.oncomplete = () => {
				db.close();
				resolve();
			};
			tx.onerror = () => {
				console.warn("[fast-smallcap] IndexedDB write failed:", tx.error);
				db.close();
				resolve();
			};
			return;
		}

		// Check if a document with the same name already exists
		const nameIndex = store.index("name");
		const getRequest = nameIndex.get(record.name);

		getRequest.onsuccess = () => {
			const existing = getRequest.result as StoredDocument | undefined;
			if (existing) {
				record.id = existing.id;
				store.put(record);
			} else {
				store.add(record as StoredDocument);
			}
		};

		getRequest.onerror = () => {
			console.warn(
				"[fast-smallcap] IndexedDB lookup failed:",
				getRequest.error
			);
			db.close();
			resolve();
		};

		tx.oncomplete = () => {
			db.close();
			resolve();
		};

		tx.onerror = () => {
			console.warn("[fast-smallcap] IndexedDB write failed:", tx.error);
			db.close();
			resolve();
		};
	});
}

/**
 * Clear all documents from the store.
 * Used for migration or reset scenarios.
 */
export async function clearAllDocuments(): Promise<void> {
	const db = await openDB();
	if (!db) {
		return;
	}

	return new Promise<void>((resolve) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		const request = store.clear();

		request.onsuccess = () => {
			db.close();
			resolve();
		};

		request.onerror = () => {
			console.warn("[fast-smallcap] IndexedDB clear failed:", request.error);
			db.close();
			resolve();
		};

		tx.oncomplete = () => {
			db.close();
		};
	});
}

/**
 * Check whether IndexedDB is available in this environment.
 */
export function isIndexedDBAvailable(): boolean {
	return typeof indexedDB !== "undefined";
}
