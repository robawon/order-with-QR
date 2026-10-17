import { translate } from './i18n';

/**
 * Maps PostgreSQL, RPC, or network error messages to friendly, user-facing text.
 * @param {any} err
 * @param {string} [lang]
 * @returns {string}
 */
export function mapErrorToMessage(err, lang = 'en') {
  if (!err) return '';
  const msg = typeof err === 'string' ? err : err.message || '';

  if (msg.includes('table_inactive')) {
    return translate('errors.table_inactive', lang);
  }
  if (msg.includes('cafe_inactive') || msg.includes('currently unavailable')) {
    return translate('errors.cafe_inactive', lang);
  }
  if (msg.includes('too_many_orders')) {
    return translate('errors.too_many_orders', lang);
  }
  if (msg.includes('item_unavailable')) {
    return translate('errors.item_unavailable', lang);
  }
  if (msg.includes('invalid_quantity')) {
    return translate('errors.invalid_quantity', lang);
  }
  if (msg.includes('invalid_items')) {
    return translate('errors.invalid_items', lang);
  }
  if (msg.includes('table limit') || msg.includes('max_tables')) {
    return translate('errors.table_limit_reached', lang);
  }
  if (msg.includes('duplicate') && msg.includes('table')) {
    return translate('errors.duplicate_table_name', lang);
  }
  if (msg.includes('category') && (msg.includes('items') || msg.includes('foreign key'))) {
    return translate('errors.category_has_items', lang);
  }
  if (msg.includes('Failed to fetch') || msg.includes('Network') || msg.includes('network')) {
    return translate('errors.network_error', lang);
  }

  return translate('errors.general', lang);
}
