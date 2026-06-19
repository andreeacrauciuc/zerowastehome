import { describe, it, expect, vi, beforeEach } from "vitest";

const docStore = new Map();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({ __collection: true })),
  doc: vi.fn((_db, collectionName, id) => ({ __ref: true, collectionName, id })),
  runTransaction: vi.fn(async (_db, updateFn) => {
    const writes = [];
    const transaction = {
      get: vi.fn(async (ref) => {
        const entry = docStore.get(ref.id);
        return {
          exists: () => Boolean(entry),
          data: () => entry,
        };
      }),
      update: vi.fn((ref, changes) => writes.push({ type: "update", id: ref.id, changes })),
      delete: vi.fn((ref) => writes.push({ type: "delete", id: ref.id })),
      set: vi.fn((ref, data) => writes.push({ type: "set", id: ref.id, data })),
    };
    const result = await updateFn(transaction);
    transaction.__writes = writes;
    runTransactionCalls.push({ transaction, writes });
    return result;
  }),
}));

let runTransactionCalls = [];

import { batchUpdateScopedDocs, batchDeleteScopedDocs } from "./dataWriteService";

const db = { __db: true };
const OWNER = "owner-abc";
const HOUSEHOLD = "house-123";

const seed = (entries) => {
  docStore.clear();
  entries.forEach(({ id, ...data }) => docStore.set(id, data));
};

const allWrites = () => runTransactionCalls.flatMap((c) => c.writes);

beforeEach(() => {
  runTransactionCalls = [];
  docStore.clear();
});

describe("batchUpdateScopedDocs", () => {
  it("updates documents owned by the active owner and restamps the scope field", async () => {
    seed([
      { id: "a", ownerId: OWNER, householdId: null, checked: false },
      { id: "b", ownerId: OWNER, householdId: null, checked: false },
    ]);

    await batchUpdateScopedDocs({
      db,
      collectionName: "shopping",
      updates: [
        { id: "a", changes: { checked: true } },
        { id: "b", changes: { checked: true } },
      ],
      ownerId: OWNER,
      householdId: null,
      scopeField: "ownerId",
      scopeValue: OWNER,
    });

    const writes = allWrites();
    expect(writes).toHaveLength(2);
    writes.forEach((w) => {
      expect(w.type).toBe("update");
      expect(w.changes.checked).toBe(true);
      expect(w.changes.ownerId).toBe(OWNER);
    });
  });

  it("matches documents by householdId when operating under a household scope", async () => {
    seed([{ id: "a", ownerId: "someone-else", householdId: HOUSEHOLD, checked: false }]);

    await batchUpdateScopedDocs({
      db,
      collectionName: "shopping",
      updates: [{ id: "a", changes: { checked: true } }],
      ownerId: OWNER,
      householdId: HOUSEHOLD,
      scopeField: "householdId",
      scopeValue: HOUSEHOLD,
    });

    const writes = allWrites();
    expect(writes).toHaveLength(1);
    expect(writes[0].changes.householdId).toBe(HOUSEHOLD);
  });

  it("aborts the transaction when a document belongs to a different scope", async () => {
    seed([
      { id: "mine", ownerId: OWNER, householdId: null },
      { id: "theirs", ownerId: "attacker", householdId: "other-house" },
    ]);

    await expect(
      batchUpdateScopedDocs({
        db,
        collectionName: "shopping",
        updates: [
          { id: "mine", changes: { checked: true } },
          { id: "theirs", changes: { checked: true } },
        ],
        ownerId: OWNER,
        householdId: null,
        scopeField: "ownerId",
        scopeValue: OWNER,
      })
    ).rejects.toThrow("DATA_SCOPE_MISMATCH");

    expect(allWrites()).toHaveLength(0);
  });

  it("skips documents that no longer exist", async () => {
    seed([{ id: "a", ownerId: OWNER, householdId: null }]);

    await batchUpdateScopedDocs({
      db,
      collectionName: "shopping",
      updates: [
        { id: "a", changes: { checked: true } },
        { id: "gone", changes: { checked: true } },
      ],
      ownerId: OWNER,
      householdId: null,
      scopeField: "ownerId",
      scopeValue: OWNER,
    });

    const writes = allWrites();
    expect(writes).toHaveLength(1);
    expect(writes[0].id).toBe("a");
  });

  it("is a no-op for empty input", async () => {
    await batchUpdateScopedDocs({
      db,
      collectionName: "shopping",
      updates: [],
      ownerId: OWNER,
      scopeField: "ownerId",
      scopeValue: OWNER,
    });
    expect(runTransactionCalls).toHaveLength(0);
  });
});

describe("batchDeleteScopedDocs", () => {
  it("deletes documents in scope", async () => {
    seed([
      { id: "a", ownerId: OWNER, householdId: null },
      { id: "b", ownerId: OWNER, householdId: null },
    ]);

    await batchDeleteScopedDocs({
      db,
      collectionName: "shopping",
      ids: ["a", "b"],
      ownerId: OWNER,
      householdId: null,
      scopeField: "ownerId",
      scopeValue: OWNER,
    });

    const writes = allWrites();
    expect(writes).toHaveLength(2);
    writes.forEach((w) => expect(w.type).toBe("delete"));
  });

  it("aborts when a target document is out of scope", async () => {
    seed([
      { id: "mine", ownerId: OWNER, householdId: null },
      { id: "theirs", ownerId: "attacker", householdId: null },
    ]);

    await expect(
      batchDeleteScopedDocs({
        db,
        collectionName: "shopping",
        ids: ["mine", "theirs"],
        ownerId: OWNER,
        householdId: null,
        scopeField: "ownerId",
        scopeValue: OWNER,
      })
    ).rejects.toThrow("DATA_SCOPE_MISMATCH");

    expect(allWrites()).toHaveLength(0);
  });

  it("skips ids that no longer exist", async () => {
    seed([{ id: "a", ownerId: OWNER, householdId: null }]);

    await batchDeleteScopedDocs({
      db,
      collectionName: "shopping",
      ids: ["a", "gone"],
      ownerId: OWNER,
      householdId: null,
      scopeField: "ownerId",
      scopeValue: OWNER,
    });

    const writes = allWrites();
    expect(writes).toHaveLength(1);
    expect(writes[0].id).toBe("a");
  });
});
