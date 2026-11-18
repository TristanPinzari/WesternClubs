// WHAT: One explicit opt-in for the new frontend-only club-exec demo.
// WITHOUT IT: Missing backend endpoints could be mistaken for successful real writes.
export const useMockExec = import.meta.env?.VITE_USE_MOCK_EXEC === "true";
