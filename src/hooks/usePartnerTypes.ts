import { useMemo } from 'react';
import type { PartnerType } from '@/lib/dataverse/types';
import { partnerTypes } from '@/lib/dataverse/entityHooks';
import { toPartnerType } from '@/lib/dataverse/partnerTypeAdminMappers';

/**
 * Charge les types de partenaires depuis Dataverse (table `afb_partnertype`)
 * et les expose sous la forme d'affichage `PartnerType[]`. Conserve la même
 * interface que React Query (data / isLoading / error) pour les consommateurs.
 */
export function usePartnerTypes() {
  const query = partnerTypes.useList({ top: 200 });
  const data = useMemo<PartnerType[] | undefined>(
    () => query.data?.map(toPartnerType),
    [query.data],
  );
  return { ...query, data };
}
