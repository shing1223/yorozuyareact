export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="animate-pulse grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border rounded h-64 bg-gray-100" />
        ))}
      </div>
    </main>
  )
}