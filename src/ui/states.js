// Shared loading / empty / error UI (SPEC §6 polish). Text via textContent.

/** A shimmer placeholder block; extra classes size it per use. */
export function skeleton(className = '') {
  const d = document.createElement('div');
  d.className = 'skeleton' + (className ? ' ' + className : '');
  return d;
}

/** A centred "nothing here" message. */
export function emptyState(text) {
  const d = document.createElement('div');
  d.className = 'state-msg empty-state';
  d.textContent = text;
  return d;
}

/** An error message with a "Try again" button that calls onRetry. */
export function errorState(text, onRetry) {
  const d = document.createElement('div');
  d.className = 'state-msg error-state';
  const p = document.createElement('p');
  p.textContent = text;
  d.append(p);
  if (onRetry) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'retry-btn';
    btn.textContent = 'Try again';
    btn.addEventListener('click', onRetry);
    d.append(btn);
  }
  return d;
}
