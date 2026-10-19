import { element, t } from './dashboard-dom.js';

let sequence = 0;

// Native radios keep keyboard/assistive-technology behavior while making a
// small, fixed set of choices visible without opening a menu.
export function createChoiceControl(label, choices, { className = '' } = {}) {
  const name = `dashboard-choice-${++sequence}`;
  const group = element('fieldset', '', `dashboard-choice-group ${className}`, { role: 'radiogroup' });
  const legend = element('legend', t(label));
  const strip = element('div', '', 'dashboard-choice-strip');
  group.append(legend, strip);
  const options = choices.map(([value, label, shortLabel]) => {
    const option = element('label', '', 'dashboard-choice');
    const input = element('input', '', 'dashboard-choice-input', {
      type: 'radio', name, value, 'aria-label': t(label)
    });
    const copy = element('span', t(shortLabel ?? label), 'dashboard-choice-label');
    option.title = t(label); option.append(input, copy); strip.append(option);
    return { value, element: option, input };
  });
  if (options.length) options[0].input.checked = true;
  return {
    element: group,
    options,
    get value() { return options.find(option => option.input.checked)?.value ?? ''; },
    set value(value) { options.forEach(option => { option.input.checked = option.value === value; }); },
    set onchange(handler) {
      group.onchange = event => {
        if (options.some(option => option.input === event.target)) handler(event);
      };
    }
  };
}
