import crypto from 'crypto'

const lookupStore = new Map()

export function saveDirectoryLookupResult({ providerIdentity, directoryData, authState }) {
  if (lookupStore.size > 1000) {
    lookupStore.clear()
  }

  const id = crypto.randomUUID()
  const serverSideRecord = {
    id,
    providerIdentity,
    authState,
    directory_user_id: directoryData.user_id || '',
    full_name: directoryData.full_name || '',
    organization_id: directoryData.organization_id || '',
    organization_name: directoryData.organization_name || '',
    primary_role:
      directoryData.primary_role != null && directoryData.primary_role !== ''
        ? String(directoryData.primary_role)
        : '',
    roles: Array.isArray(directoryData.roles) ? directoryData.roles : [],
    is_system_admin: Boolean(directoryData.is_system_admin),
    created_at: new Date().toISOString(),
  }

  lookupStore.set(id, serverSideRecord)
  return serverSideRecord
}
