function WaitingApprovalPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-6 py-12">
      <section className="w-full rounded-lg border border-slate-700 bg-slate-900/50 p-8">
        <h1 className="text-3xl font-semibold">Access Pending</h1>
        <p className="mt-4 text-slate-300">
          Your account is not yet registered in the system.
        </p>
        <p className="mt-2 text-slate-300">
          Please contact your company HR so they can register you and associate you with your
          organization.
        </p>
        <p className="mt-2 text-slate-300">
          Once this is completed, you will be able to sign in successfully.
        </p>
        <p className="mt-4 text-sm text-slate-400">
          If you believe this is a mistake, please contact your company administrator or HR team.
        </p>
      </section>
    </main>
  )
}

export default WaitingApprovalPage
