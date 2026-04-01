import { Link } from 'react-router-dom'

const DECISION_COPY = {
  AUTHENTICATED_NO_ORG: {
    title: 'Authenticated, organization missing',
    description: 'Your account was found but is not linked to an organization yet.',
  },
  USER_NOT_FOUND: {
    title: 'User not found',
    description: 'No matching user was found in Directory. Contact support or onboarding flow.',
  },
  LOOKUP_FAILED: {
    title: 'Lookup failed',
    description: 'Directory lookup failed. Please retry in a few moments.',
  },
}

function DecisionStatePage({ stateCode }) {
  const copy = DECISION_COPY[stateCode] || {
    title: 'Authentication not completed',
    description: 'Sign in again or retry session bootstrap.',
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">{copy.title}</h1>
      <p className="mt-3 text-slate-300">{copy.description}</p>
      <Link className="mt-6 inline-block rounded-md bg-slate-700 px-4 py-2 hover:bg-slate-600" to="/login">
        Back to login
      </Link>
    </main>
  )
}

export default DecisionStatePage
