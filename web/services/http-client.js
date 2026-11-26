export class ApiError extends Error {
  constructor(message, details = {}) { super(message); Object.assign(this, details); }
}

export function createHttpClient(fetcher = (...args) => fetch(...args)) {
  async function request(path, method = 'GET', body) {
    let response;
    try {
      response = await fetcher(`/api${path}`, {
        method, cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(8000),
        ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new ApiError(method === 'GET' ? 'Cannot reach the local service. Check that it is running and try again.' : 'The save result could not be confirmed. Your draft is kept. Reload the latest data before retrying.', { code: 'CONNECTION_UNCONFIRMED' });
    }
    let data;
    try { data = await response.json(); } catch { throw new ApiError('The service returned an unreadable response. Reload the latest data before retrying.', { code: 'INVALID_RESPONSE' }); }
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith('/auth/') && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pantry-auth-unauthorized'));
      }
      throw new ApiError(data.error?.message || 'The request failed.', { ...data.error, status: response.status });
    }
    return data;
  }
  return {
    getAuthStatus: () => request('/auth/status'),
    getAuthSession: () => request('/auth/session'),
    setupAccount: ({ username, password, rememberMe = false }) => request('/auth/setup', 'POST', { username, password, rememberMe }),
    login: ({ username, password, rememberMe = false }) => request('/auth/login', 'POST', { username, password, rememberMe }),
    logout: () => request('/auth/logout', 'POST', {}),
    changePassword: ({ currentPassword, newPassword }) => request('/auth/password', 'PUT', { currentPassword, newPassword }),
    getSnapshot: () => request('/snapshot'),
    getStapleRecommendations: (query = '') => request(`/recommendations/staples${query ? `?${query}` : ''}`),
    getDailyInspiration: (query = '') => request(`/inspiration${query ? `?${query}` : ''}`),
    getNutritionIndex: () => request('/nutrition'),
    getNutritionDetail: recipeId => request(`/nutrition/${encodeURIComponent(recipeId)}`),
    onboard: (mode, expectedRevision) => request('/onboarding', 'POST', { mode, expectedRevision }),
    savePantryItem: (item, expectedRevision) => request(`/pantry/${encodeURIComponent(item.ingredientId)}`, 'PUT', { quantity: item.quantity, unit: item.unit, expectedRevision }),
    deletePantryItem: (id, expectedRevision) => request(`/pantry/${encodeURIComponent(id)}`, 'DELETE', { expectedRevision }),
    selectShoppingRecipe: (recipeId, expectedRevision) => request('/shopping-selection', 'PUT', { recipeId, expectedRevision }),
    removeShoppingRecipe: (id, expectedRevision) => request(`/shopping-selection/${encodeURIComponent(id)}`, 'DELETE', { expectedRevision }),
    clearShoppingSelection: (_, expectedRevision) => request('/shopping-selection', 'DELETE', { expectedRevision }),
    markPurchased: ({ ingredientId, unit, quantity }, expectedRevision) => request(
      `/purchased-marks/${encodeURIComponent(ingredientId)}`, 'PUT', { unit, expectedQuantity: quantity, expectedRevision },
    ),
    unmarkPurchased: ({ ingredientId, unit }, expectedRevision) => request(
      `/purchased-marks/${encodeURIComponent(ingredientId)}`, 'DELETE', { unit, expectedRevision },
    ),
  };
}
