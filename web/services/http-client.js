export class ApiError extends Error {
  constructor(message, details = {}) { super(message); Object.assign(this, details); }
}
export function createHttpClient(fetcher = (...args) => fetch(...args)) {
  async function request(path, method = 'GET', body) {
    let response;
    try {
      response = await fetcher(`/api${path}`, {
        method, cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(8000),
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new ApiError(method === 'GET' ? 'Cannot reach the local service. Check that it is running and try again.' : 'The save result could not be confirmed. Your draft is kept. Reload the latest data before retrying.', { code: 'CONNECTION_UNCONFIRMED' });
    }
    let data;
    try { data = await response.json(); } catch { throw new ApiError('The service returned an unreadable response. Reload the latest data before retrying.', { code: 'INVALID_RESPONSE' }); }
    if (!response.ok) throw new ApiError(data.error?.message || 'The request failed.', { ...data.error, status: response.status });
    return data;
  }
  return {
    getSnapshot: () => request('/snapshot'),
    onboard: (mode, expectedRevision) => request('/onboarding', 'POST', { mode, expectedRevision }),
    savePantryItem: (item, expectedRevision) => request(`/pantry/${encodeURIComponent(item.ingredientId)}`, 'PUT', { quantity: item.quantity, unit: item.unit, expectedRevision }),
    deletePantryItem: (id, expectedRevision) => request(`/pantry/${encodeURIComponent(id)}`, 'DELETE', { expectedRevision }),
    selectShoppingRecipe: (recipeId, expectedRevision) => request('/shopping-selection', 'PUT', { recipeId, expectedRevision }),
    removeShoppingRecipe: (id, expectedRevision) => request(`/shopping-selection/${encodeURIComponent(id)}`, 'DELETE', { expectedRevision }),
    clearShoppingSelection: (_, expectedRevision) => request('/shopping-selection', 'DELETE', { expectedRevision }),
  };
}
