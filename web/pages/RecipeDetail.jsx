import { useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { Icon, PageHeading, RecipeStatus } from '../components/ui.jsx';
import { NutritionPanel } from '../components/Nutrition.jsx';
import { formatQuantity, getIngredientName, getLocalizedRecipe, translateError, useI18n } from '../i18n/index.jsx';

export default function RecipeDetail({ recipeId }) {
  const { snapshot, busy, mutate } = useApp();
  const { lang, t } = useI18n();
  const [error, setError] = useState(null);
  const rawRecipe = snapshot.recipes.find(item => item.id === recipeId);
  if (!rawRecipe) return <><PageHeading title={t.recipeNotFoundTitle} subtitle={t.recipeNotFoundSubtitle} /><a href="#/recipes">{t.backToRecipes}</a></>;
  const recipe = getLocalizedRecipe(rawRecipe, lang);
  const evaluation = snapshot.evaluations.find(item => item.recipeId === recipeId);
  const inList = snapshot.shoppingRecipeIds?.includes(recipeId);

  async function addToList() {
    if (inList) { window.location.hash = '/shopping'; return; }
    const result = await mutate('selectShoppingRecipe', recipeId, 'recipeSavedNotice');
    if (result.ok) window.location.hash = '/shopping';
    else setError(result.error);
  }

  return <>
    <a className="back-link" href="#/recipes"><Icon name="back" />{t.backToRecipes}</a>
    <PageHeading title={recipe.displayTitle} subtitle={`${t.servingsMeta(recipe.servings, recipe.time)} · ${recipe.displayDescription}`} />
    <div className="detail-layout">
      <div className="detail-content">
        <RecipeStatus evaluation={evaluation} />
        <h2>{t.whatYouNeed}</h2>
        <p className="helper">{t.foodSeasoningHelper}</p>
        <div className="table-scroll"><table className="comparison-table"><caption className="sr-only">{t.tableCaption(recipe.displayTitle)}</caption><thead><tr><th scope="col">{t.colIngredient}</th><th scope="col">{t.colNeed}</th><th scope="col">{t.colHave}</th><th scope="col">{t.colMissing}</th></tr></thead><tbody>
          {recipe.requirements.map(item => {
            const ingredient = snapshot.ingredients.find(entry => entry.id === item.ingredientId);
            const stock = snapshot.pantry.find(entry => entry.ingredientId === item.ingredientId);
            const unitIssue = evaluation.unitIssues.some(entry => entry.ingredientId === item.ingredientId);
            const shortage = evaluation.shortages.find(entry => entry.ingredientId === item.ingredientId);
            return <tr key={item.ingredientId}><th scope="row">{getIngredientName(ingredient, lang)}<small className="ingredient-kind">{item.role === 'seasoning' ? t.roleSeasoning : t.roleFood}</small></th><td>{formatQuantity(item.quantity, item.unit, lang)}</td><td>{stock ? formatQuantity(stock.quantity, stock.unit, lang) : formatQuantity(0, item.unit, lang)}</td><td className={unitIssue || shortage ? 'missing-cell' : 'ready-cell'}>{unitIssue ? t.checkUnits : formatQuantity(shortage?.quantity ?? 0, item.unit, lang)}</td></tr>;
          })}
        </tbody></table></div>
        <p className="helper">{recipe.displayNote}</p>
        <div className="detail-cta">
          {evaluation.status === 'checkUnits' ? <><p className="error">{t.detailUnitError}</p><a className="button" href="#/pantry">{t.checkPantryUnits}</a></> : <>
            {evaluation.status === 'ready' ? <p className="success">{t.detailReadyMessage}</p> : null}
            <button onClick={addToList} disabled={busy}><Icon name="bag" />{busy ? t.updating : inList ? t.viewSavedList : evaluation.status === 'ready' ? t.addRecipeToList : t.addMissingToList}</button>
            <p className="helper">{inList ? t.alreadyInListHelper : t.addAlongsideHelper}</p>
          </>}
          {error ? <p className="error" role="alert">{translateError(error, lang)}</p> : null}
        </div>
        <NutritionPanel recipeId={recipe.id} />
        <section className="instructions">
          <h2>{t.howToMakeIt}</h2>
          <ol>{recipe.displaySteps.map((step, index) => <li key={index}>{step}</li>)}</ol>
          <p className="source">{recipe.displaySource} {recipe.sourceUrl ? <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">{t.viewOriginalRecipe}</a> : null}</p>
          <p className="source">{recipe.displayImageCredit} {recipe.imageSourceUrl ? <a href={recipe.imageSourceUrl} target="_blank" rel="noreferrer">{t.imageSource}</a> : null} {recipe.imageLicenseUrl ? <a href={recipe.imageLicenseUrl} target="_blank" rel="noreferrer">{t.imageLicense}</a> : null}</p>
          {recipe.sourceLicense === 'CC BY-SA 4.0' ? <p className="source">{t.ccLicensePrefix}<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">{t.ccLicenseName}</a> · <a href="/recipe-licenses/unitools.txt">{t.ccLicenseText}</a>{t.ccLicenseSuffix}</p> : null}
          {recipe.displayAdaptationNotes ? <details className="source"><summary>{t.adaptationDetailsSummary}</summary><p>{recipe.displayAdaptationNotes}</p></details> : null}
        </section>
      </div>
      <img className="detail-photo" src={recipe.image} alt={recipe.displayImageAlt} />
    </div>
  </>;
}
