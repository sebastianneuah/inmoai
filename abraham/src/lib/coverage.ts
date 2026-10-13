import type { Address, Branch } from '@/types';

/** Coverage is decided by configured neighbourhoods per kitchen — never by raw distance. */
export function isCovered(address: Address | undefined, branch: Branch | undefined) {
  if (!address || !branch) return false;
  return branch.delivery.enabled && branch.delivery.coverage.includes(address.neighborhood);
}

export function formatAddress(a: Address) {
  return `${a.street} ${a.number}${a.apartment ? `, ${a.apartment}` : ''}`;
}
