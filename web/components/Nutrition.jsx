import { useEffect, useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { client } from '../services/client.js';
import { getIngredientName, getUnitLabel, translateError, useI18n } from '../i18n/index.jsx';

function formatIngredientNames(ids, ingredientMap, lang) {
  const sep = lang === 'zh-CN' ? '、' : ', ';
  return ids.map(id => {
    const ingredient = ingredientMap.get(id);
    if (ingredient) return getIngredientName(ingredient, lang);
    return lang === 'zh-CN' ? '' : id;
  }).filter(Boolean).join(sep);
}

function formatAssumptionNote(notes, lang) {
  if (!notes) return '';
  if (lang !== 'zh-CN') return notes;
  const parts = [];
  if (/oil absorption|oil retention|poaching bath|frying oil/i.test(notes)) parts.push('已按油炸或油浸吸油率折算');
  if (/edible.*yield|bone refuse|shell refuse|broth.*extraction/i.test(notes)) parts.push('已按去骨、去壳可食部或出汤比例折算');
  if (/zero energy|0 kcal|energy 0/i.test(notes)) parts.push('公开营养来源标注为零热量调料');
  if (parts.length === 0) parts.push('依据美国农业部标准食品成分数据库核验估算');
  return parts.join('；');
}

function formatUnavailableReason(nutrition, ingredientMap, lang, t) {
  const unmapped = nutrition.unmappedRequired || [];
  const names = formatIngredientNames(unmapped, ingredientMap, lang);
  if (names) return t.nutritionUnavailableReason(names);
  if (lang === 'en' && nutrition.unavailableReason) return nutrition.unavailableReason;
  return t.nutritionUnavailableGeneric;
}

function formatConversionBasis(record, lang, t) {
  if (record.basisUnit === 'ml' && Number.isFinite(record.densityGPerMl)) {
    return t.nutritionBasisMl(record.densityGPerMl);
  }
  if (record.basisUnit === 'piece' && Number.isFinite(record.gramsPerPiece)) {
    return t.nutritionBasisPiece(record.gramsPerPiece);
  }
  return t.nutritionBasisG(getUnitLabel(record.basisUnit, lang));
}

export function NutritionBadge({ nutrition }) {
  const { t } = useI18n();
  if (!nutrition) return null;

  if (nutrition.status === 'estimated') {
    if (nutrition.display?.perServingKcal !== null && nutrition.display?.perServingKcal !== undefined) {
      return (
        <p className="nutrition-badge nutrition-estimated">
          {t.nutritionPerServingBrief(nutrition.display.perServingKcal)}
        </p>
      );
    }
    if (nutrition.display?.wholeDishKcal !== null && nutrition.display?.wholeDishKcal !== undefined) {
      return (
        <p className="nutrition-badge nutrition-estimated">
          {t.nutritionWholeBriefPerServingUnavailable(nutrition.display.wholeDishKcal)}
        </p>
      );
    }
  }

  return <p className="nutrition-badge nutrition-unavailable">{t.nutritionUnavailableBrief}</p>;
}

const EMPTY_NUTRITION_DETAIL = { recipeId: null, catalogVersion: null, status: 'loading', data: null, error: null };

export function NutritionPanel({ recipeId }) {
  const { snapshot } = useApp();
  const { lang, t } = useI18n();
  const catalogVersion = snapshot?.catalogVersion ?? null;
  const [loadedState, setState] = useState(EMPTY_NUTRITION_DETAIL);
  const [retryTick, setRetryTick] = useState(0);

  // Hide estimates and sources from a different recipe or previous catalog immediately, before the effect runs.
  const state = loadedState.recipeId === recipeId && loadedState.catalogVersion === catalogVersion
    ? loadedState
    : { ...EMPTY_NUTRITION_DETAIL, recipeId, catalogVersion };

  useEffect(() => {
    if (!catalogVersion) return;
    let cancelled = false;
    setState({ recipeId, catalogVersion, status: 'loading', data: null, error: null });
    client.getNutritionDetail(recipeId)
      .then(data => {
        if (cancelled) return;
        if (data.recipeId !== recipeId || data.catalogVersion !== catalogVersion) {
          setState({
            recipeId,
            catalogVersion,
            status: 'error',
            data: null,
            error: { key: 'nutritionDetailStaleError' },
          });
          return;
        }
        setState({ recipeId, catalogVersion, status: 'ready', data, error: null });
      })
      .catch(error => {
        if (!cancelled) setState({ recipeId, catalogVersion, status: 'error', data: null, error });
      });
    return () => { cancelled = true; };
  }, [recipeId, catalogVersion, retryTick]);

  const ingredientMap = new Map((snapshot?.ingredients || []).map(item => [item.id, item]));
  const detail = state.status === 'ready' && state.data?.recipeId === recipeId && state.data?.catalogVersion === catalogVersion
    ? state.data
    : null;
  const errorMessage = state.error
    ? (state.error.key ? t[state.error.key] : translateError(state.error, lang))
    : '';

  return (
    <section className="nutrition-panel" aria-label={t.nutritionSectionAria}>
      <div className="nutrition-header">
        <h2>{t.nutritionHeading}</h2>
        {state.status === 'ready' && detail ? (
          <span className={`nutrition-pill ${detail.status === 'estimated' ? 'nutrition-pill-estimated' : 'nutrition-pill-unavailable'}`}>
            {detail.status === 'estimated' ? t.nutritionSourcedEstimateLabel : t.nutritionUnavailableLabel}
          </span>
        ) : null}
      </div>

      {state.status === 'loading' && !detail ? (
        <p className="helper" role="status">{t.nutritionLoading}</p>
      ) : state.status === 'error' ? (
        <div className="nutrition-error" role="alert">
          <p className="error">{errorMessage}</p>
          <button type="button" className="secondary nutrition-retry" onClick={() => setRetryTick(n => n + 1)}>
            {t.tryAgain}
          </button>
        </div>
      ) : detail ? (
        detail.status === 'estimated' ? (
          <>
            <dl className="nutrition-metrics">
              <div className="nutrition-metric">
                <dt>{t.nutritionPerServingLabel}</dt>
                <dd>
                  {detail.display?.perServingKcal !== null && detail.display?.perServingKcal !== undefined
                    ? t.nutritionKcalValue(detail.display.perServingKcal)
                    : t.nutritionUnavailableLabel}
                </dd>
              </div>
              <div className="nutrition-metric">
                <dt>{t.nutritionWholeDishLabel}</dt>
                <dd>
                  {detail.display?.wholeDishKcal !== null && detail.display?.wholeDishKcal !== undefined
                    ? t.nutritionKcalValue(detail.display.wholeDishKcal)
                    : t.nutritionUnavailableLabel}
                </dd>
              </div>
              <div className="nutrition-metric">
                <dt>{t.nutritionBaseServingsLabel}</dt>
                <dd>
                  {detail.servings !== null && detail.servings !== undefined
                    ? t.nutritionServingsValue(detail.servings)
                    : t.nutritionServingsUnavailable}
                </dd>
              </div>
            </dl>

            <p className="helper">{t.nutritionEstimateDisclaimer}</p>

            {detail.servings === null ? (
              <p className="helper nutrition-note">{t.nutritionPerServingMissingServings}</p>
            ) : null}

            {detail.assumptions?.length > 0 ? (
              <div className="nutrition-assumptions">
                <h3>{t.nutritionAssumptionsHeading}</h3>
                <ul>
                  {detail.assumptions.map((item, idx) => {
                    const ing = ingredientMap.get(item.ingredientId);
                    const name = ing ? getIngredientName(ing, lang) : item.ingredientId;
                    const stateLabel = t.nutritionStates[item.state] || item.state;
                    const noteText = formatAssumptionNote(item.notes, lang);
                    return (
                      <li key={`${item.ingredientId}-${idx}`}>
                        <strong>{name}</strong>{lang === 'zh-CN' ? `（${stateLabel}）` : ` (${stateLabel})`}{noteText ? `${lang === 'zh-CN' ? '：' : ': '}${noteText}` : ''}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {detail.mappings?.length > 0 ? (
              <details className="nutrition-sources">
                <summary>{t.nutritionSourcesSummary(detail.mappings.length)}</summary>
                <ul className="nutrition-source-list">
                  {detail.mappings.map(record => {
                    const ing = ingredientMap.get(record.ingredientId);
                    const name = ing ? getIngredientName(ing, lang) : record.ingredientId;
                    const stateLabel = t.nutritionStates[record.state] || record.state;
                    return (
                      <li key={`${record.ingredientId}|${record.basisUnit}`} className="nutrition-source-item">
                        <div className="nutrition-source-title">
                          <strong>{name}</strong> · <span>{record.entryName}</span>
                        </div>
                        <p className="nutrition-source-meta">
                          {t.nutritionKcalPer100g(record.kcalPer100g)} · {t.nutritionStateLabel(stateLabel)} · {formatConversionBasis(record, lang, t)}
                        </p>
                        {record.notes ? <p className="nutrition-source-notes">{record.notes}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </details>
            ) : null}
          </>
        ) : (
          <>
            {detail.servings !== null && detail.servings !== undefined ? (
              <p className="nutrition-servings-inline">
                <strong>{t.nutritionBaseServingsLabel}{lang === 'zh-CN' ? '：' : ': '}</strong>
                {t.nutritionServingsValue(detail.servings)}
              </p>
            ) : null}
            <p className="nutrition-unavailable-reason">
              {formatUnavailableReason(detail, ingredientMap, lang, t)}
            </p>
            <p className="helper">{t.nutritionUnavailableHelper}</p>
            {detail.mappings?.length > 0 ? (
              <details className="nutrition-sources">
                <summary>{t.nutritionPartialSourcesSummary(detail.mappings.length)}</summary>
                <ul className="nutrition-source-list">
                  {detail.mappings.map(record => {
                    const ing = ingredientMap.get(record.ingredientId);
                    const name = ing ? getIngredientName(ing, lang) : record.ingredientId;
                    const stateLabel = t.nutritionStates[record.state] || record.state;
                    return (
                      <li key={`${record.ingredientId}|${record.basisUnit}`} className="nutrition-source-item">
                        <div className="nutrition-source-title">
                          <strong>{name}</strong> · <span>{record.entryName}</span>
                        </div>
                        <p className="nutrition-source-meta">
                          {t.nutritionKcalPer100g(record.kcalPer100g)} · {t.nutritionStateLabel(stateLabel)} · {formatConversionBasis(record, lang, t)}
                        </p>
                        {record.notes ? <p className="nutrition-source-notes">{record.notes}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </details>
            ) : null}
          </>
        )
      ) : null}
    </section>
  );
}
