import AppHeader from '../components/AppHeader'

function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <AppHeader />

      <section className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
        <h2 className="text-xl font-medium">Scaffold Ready</h2>
        <p className="mt-3 text-slate-300">
          This project intentionally includes only baseline frontend infrastructure.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-slate-300">
          <li>React + JavaScript + Tailwind foundation</li>
          <li>Service and hooks folders for upcoming auth integration</li>
          <li>No auth business logic implemented yet</li>
        </ul>
      </section>
    </main>
  )
}

export default HomePage
