import { cardKey } from './card-layout-motion.js';
import { createCardLayout } from './card-layout.js';

// Read a complete generation before changing card state or creating DOM. A
// newer refresh or an unmounted view can discard pending reads without leaks.
export function createCardBoard({ container, addButton, readCard, createCard, createEmpty }) {
  const layout = createCardLayout(container);
  let records = new Map(), generation = 0, destroyed = false;

  return {
    layout,
    invalidate() { generation++; },
    finishMotion() { records.forEach(record => record.readout?.finishMotion()); },
    async render(cards, { metadata, showEmpty, beforeCommit = () => {} } = {}) {
      const version = ++generation;
      const loaded = await Promise.all(cards.map(async card => {
        try { return { card, data: await readCard(card), failed: false }; }
        catch { return { card, failed: true }; }
      }));
      if (destroyed || version !== generation) return;
      const next = new Map(), fresh = [], content = [];
      try {
        if (showEmpty) content.push(createEmpty());
        for (const { card, data, failed } of loaded) {
          const { position, createdAt, updatedAt, ...definition } = card;
          const fingerprint = failed ? null : JSON.stringify([definition, data, metadata]);
          const previous = records.get(card.id);
          let record = previous;
          if (!fingerprint || previous?.fingerprint !== fingerprint) {
            record = createCard(card, { data, failed, previous });
            record.fingerprint = fingerprint; fresh.push(record);
          }
          next.set(card.id, record); content.push(record.article);
        }
      } catch (error) {
        fresh.forEach(record => record.dispose());
        throw error;
      }
      content.push(addButton);
      const retired = new Map([...records.values()].filter(record => next.get(cardKey(record.article)) !== record)
        .map(record => [record.article, record]));
      for (const record of retired.values()) { record.readout?.destroy(); record.readout = null; }
      beforeCommit();
      layout.reconcile(content, article => retired.get(article)?.dispose());
      records = next;
      fresh.forEach(record => record.readout?.play());
    },
    destroy() {
      destroyed = true; generation++;
      layout.destroy(); records.forEach(record => record.dispose()); records.clear();
    }
  };
}
