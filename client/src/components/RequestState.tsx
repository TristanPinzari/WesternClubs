// WHAT: Shared accessible loading/error messages and retry for the exec pages.
// WITHOUT IT: A failed dependency would leave a blank page or a silent form.
export default function RequestState({
  loading,
  error,
  retry,
}: {
  loading?: boolean;
  error?: string | null;
  retry?: () => void;
}) {
  return (
    <>
      {loading && (
        <p role="status" className="my-4 text-gray-600">
          Loading…
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="my-4 rounded-lg bg-red-50 p-4 text-red-800"
        >
          <p>{error}</p>
          {retry && (
            <button
              type="button"
              onClick={retry}
              className="min-h-11 underline"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </>
  );
}
