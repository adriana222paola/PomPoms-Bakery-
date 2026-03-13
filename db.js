/* === Pompompurin's Dessert DB (IndexedDB Wrapper) ===
 * Handles storage of recipes, images, pantry, logs, and shopping list.
 */
const DB = (() => {
    const DB_NAME = 'PompomPurinRecipesDB';
    const DB_VERSION = 3; // Incremented version to add shopping store
    const STORES = {
        RECIPES: 'recipes',
        PANTRY: 'pantry',
        LOGS: 'logs',
        SHOPPING: 'shopping'
    };
    let _db = null;

    const open = () => new Promise((resolve, reject) => {
        if (_db) return resolve(_db);
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORES.RECIPES)) {
                db.createObjectStore(STORES.RECIPES, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.PANTRY)) {
                db.createObjectStore(STORES.PANTRY, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.LOGS)) {
                db.createObjectStore(STORES.LOGS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.SHOPPING)) {
                db.createObjectStore(STORES.SHOPPING, { keyPath: 'id' });
            }
        };
        req.onsuccess = e => { _db = e.target.result; resolve(_db); };
        req.onerror = e => reject(e.target.error);
    });

    const _tx = (storeName, mode) => _db.transaction(storeName, mode).objectStore(storeName);

    const getAll = (storeName) => new Promise((resolve, reject) => {
        const req = _tx(storeName, 'readonly').getAll();
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });

    const save = (storeName, item) => new Promise((resolve, reject) => {
        const req = _tx(storeName, 'readwrite').put(item);
        req.onsuccess = () => resolve(item);
        req.onerror = e => reject(e.target.error);
    });

    const deleteItem = (storeName, id) => new Promise((resolve, reject) => {
        const req = _tx(storeName, 'readwrite').delete(id);
        req.onsuccess = () => resolve();
        req.onerror = e => reject(e.target.error);
    });

    return { open, getAll, save, deleteItem, STORES };
})();
