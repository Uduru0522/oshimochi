import { element, t } from './dashboard-dom.js';
import { createReadout, readoutSignature } from './card-readout.js';

// A preview owns its pending read and readout for one open editor session.
export function createCardPreview({ refs, readCard, colorFor, sourceLabel, issueMessage, coverage, calculationNames, onValidityChange }) {
  const $ = id => refs[id];
  let active = false, generation = 0, current = null, signature = null, valid = false;
  function setValid(value) { valid = value; onValidityChange(value); }
  function clearReadout() { current?.destroy(); current = null; signature = null; }
  function invalid(message) {
    clearReadout(); setValid(false);
    $('preview-value').textContent = '—'; $('preview-value').removeAttribute('aria-busy');
    $('preview-guidance').hidden = false; $('preview-guidance').textContent = message;
  }
  function close() {
    active = false; generation++; clearReadout(); setValid(false);
    $('preview-value').removeAttribute('aria-busy');
  }
  return {
    get valid() { return valid; },
    open() { close(); active = true; $('preview-value').textContent = '—'; },
    close,
    async update({ title, readDraft }) {
      if (!active) return;
      const version = ++generation;
      const stale = () => !active || version !== generation;
      $('preview-title').textContent = $('preview-title').title = title || t('Your card');
      $('preview-coverage').textContent = ''; $('preview-description').textContent = '';
      $('preview-value').setAttribute('aria-busy', 'true'); setValid(false);
      let card;
      try { card = readDraft(); }
      catch (error) { invalid(error.message); return; }
      try {
        const result = await readCard(card);
        if (stale()) return;
        if (result.status === 'needs-repair') { invalid(result.issues.map(issueMessage).join(' ')); return; }
        const nextSignature = readoutSignature(card, result);
        const readout = createReadout(card, result, { colorFor, animate: signature !== nextSignature });
        current?.destroy(); current = readout; signature = nextSignature;
        $('preview-value').replaceChildren(readout.element); $('preview-value').removeAttribute('aria-busy'); readout.play();
        $('preview-guidance').hidden = true;
        $('preview-coverage').textContent = coverage(result, card.calculation);
        const labels = card.sources.map(source => sourceLabel(source, card.calculation)).join('; ');
        $('preview-description').append(element('p', t('{calculation} across {sources}.', { calculation: calculationNames[card.calculation], sources: labels })));
        if (card.groupBy.type === 'field') $('preview-description').append(element('p', t('Ring grouped by {fields}. Items without a category appear as Uncategorized.', { fields: card.groupBy.fields.map(field => field.fieldName).join(', ') }), 'help'));
        if (card.calculation !== 'count') $('preview-description').append(element('p', t('Missing values are excluded. Zero is included.'), 'help'));
        setValid(true);
      } catch {
        if (!stale()) invalid(t('Could not load the preview. Change a setting to try again.'));
      }
    }
  };
}
