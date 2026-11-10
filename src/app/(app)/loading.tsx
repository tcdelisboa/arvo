export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse">
      <div className="h-10 w-56 rounded-control bg-sunken" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-sunken" />
      <div className="mt-8 h-40 rounded-panel bg-sunken" />
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="h-64 rounded-panel bg-sunken" />
        <div className="h-64 rounded-panel bg-sunken" />
      </div>
    </div>
  );
}
