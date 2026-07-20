/**
 * Fabrique générique de hooks React Query pour une table Dataverse.
 *
 * Chaque service généré (src/generated/services/*Service.ts) expose la même
 * forme statique : getAll / get / create / update / delete. Cette fabrique
 * enveloppe ce service dans des hooks React Query typés, avec gestion du
 * cache, du chargement, des erreurs et invalidation automatique après mutation.
 *
 * Usage (voir entityHooks.ts pour les 23 tables déjà câblées) :
 *   const tiers = createEntityHooks('afb_tiers', Afb_tiersesService);
 *   const { data, isLoading } = tiers.useList({ top: 50 });
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type { IOperationResult } from '@microsoft/power-apps/data';
import type { IGetAllOptions, IGetOptions } from '@/generated/models/CommonModels';
import { logAudit } from './auditLogger';

/**
 * Forme statique commune à tous les services Dataverse générés.
 * `TModel`  = type de l'enregistrement renvoyé.
 * `TCreate` = champs acceptés en création (clé primaire exclue).
 */
export interface EntityService<TModel, TCreate> {
  getAll(options?: IGetAllOptions): Promise<IOperationResult<TModel[]>>;
  get(id: string, options?: IGetOptions): Promise<IOperationResult<TModel>>;
  create(record: TCreate): Promise<IOperationResult<TModel>>;
  update(id: string, changedFields: Partial<TCreate>): Promise<IOperationResult<TModel>>;
  delete(id: string): Promise<void>;
}

/** Déballe un IOperationResult ou lève une erreur exploitable par React Query. */
function unwrap<T>(result: IOperationResult<T>, entityName: string): T {
  if (!result.success) {
    throw result.error ?? new Error(`Dataverse : échec de l'opération sur « ${entityName} ».`);
  }
  return result.data;
}

export function createEntityHooks<TModel, TCreate>(
  /** Nom logique de la table, ex. 'afb_tiers'. Sert de préfixe aux clés de cache. */
  entityName: string,
  service: EntityService<TModel, TCreate>,
) {
  /** Clés de cache structurées, réutilisables pour des invalidations ciblées. */
  const keys = {
    all: [entityName] as const,
    lists: () => [entityName, 'list'] as const,
    list: (options?: IGetAllOptions) => [entityName, 'list', options ?? null] as const,
    details: () => [entityName, 'detail'] as const,
    detail: (id: string) => [entityName, 'detail', id] as const,
  };

  /** Liste (retrieveMultiple). Passe des options OData : filter, orderBy, top, select… */
  function useList(
    options?: IGetAllOptions,
    queryOptions?: Omit<UseQueryOptions<TModel[], Error>, 'queryKey' | 'queryFn'>,
  ) {
    return useQuery<TModel[], Error>({
      queryKey: keys.list(options),
      queryFn: async () => unwrap(await service.getAll(options), entityName),
      ...queryOptions,
    });
  }

  /** Un enregistrement par son identifiant (clé primaire). Désactivé si id vide. */
  function useGet(
    id: string | undefined | null,
    options?: IGetOptions,
    queryOptions?: Omit<UseQueryOptions<TModel, Error>, 'queryKey' | 'queryFn' | 'enabled'> & {
      enabled?: boolean;
    },
  ) {
    return useQuery<TModel, Error>({
      queryKey: keys.detail(id ?? ''),
      queryFn: async () => unwrap(await service.get(id as string, options), entityName),
      enabled: Boolean(id) && (queryOptions?.enabled ?? true),
      ...queryOptions,
    });
  }

  /** Création. Invalide les listes en cas de succès. */
  function useCreate(
    mutationOptions?: Omit<UseMutationOptions<TModel, Error, TCreate>, 'mutationFn'>,
  ) {
    const queryClient = useQueryClient();
    return useMutation<TModel, Error, TCreate>({
      mutationFn: async (record) => unwrap(await service.create(record), entityName),
      ...mutationOptions,
      onSuccess: async (data, variables, onMutateResult, context) => {
        // Journalisation best-effort (ne bloque pas le flux) ; une fois la ligne
        // d'audit écrite, on rafraîchit le journal pour que « Créé par » /
        // traçabilité apparaissent sans recharger la page.
        if (entityName !== 'afb_journalaudit') {
          void logAudit({
            entity: entityName,
            recordId: (data as Record<string, unknown> | undefined)?.[`${entityName}id`] as string | undefined,
            action: 'create',
          }).finally(() => {
            void queryClient.invalidateQueries({ queryKey: ['afb_journalaudit', 'list'], refetchType: 'all' });
          });
        }
        // refetchType: 'all' force aussi les requêtes inactives ; await garantit
        // que la liste est à jour avant la fin de la mutation.
        await queryClient.invalidateQueries({ queryKey: keys.lists(), refetchType: 'all' });
        mutationOptions?.onSuccess?.(data, variables, onMutateResult, context);
      },
    });
  }

  /** Mise à jour. Invalide la liste et le détail concerné. */
  function useUpdate(
    mutationOptions?: Omit<
      UseMutationOptions<TModel, Error, { id: string; changes: Partial<TCreate> }>,
      'mutationFn'
    >,
  ) {
    const queryClient = useQueryClient();
    return useMutation<TModel, Error, { id: string; changes: Partial<TCreate> }>({
      mutationFn: async ({ id, changes }) => unwrap(await service.update(id, changes), entityName),
      ...mutationOptions,
      onSuccess: async (data, variables, onMutateResult, context) => {
        void logAudit({ entity: entityName, recordId: variables.id, action: 'update' });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: keys.lists(), refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: keys.detail(variables.id), refetchType: 'all' }),
        ]);
        mutationOptions?.onSuccess?.(data, variables, onMutateResult, context);
      },
    });
  }

  /** Suppression. Invalide la liste et retire le détail du cache. */
  function useDelete(
    mutationOptions?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>,
  ) {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
      mutationFn: async (id) => service.delete(id),
      ...mutationOptions,
      onSuccess: async (data, id, onMutateResult, context) => {
        void logAudit({ entity: entityName, recordId: id, action: 'delete' });
        await queryClient.invalidateQueries({ queryKey: keys.lists(), refetchType: 'all' });
        queryClient.removeQueries({ queryKey: keys.detail(id) });
        mutationOptions?.onSuccess?.(data, id, onMutateResult, context);
      },
    });
  }

  return { keys, useList, useGet, useCreate, useUpdate, useDelete };
}
