import { MicrosoftDataverseService } from '@/generated/services/MicrosoftDataverseService';
import type { PartnerType } from './types';

const TABLE_NAME = 'afb_typedepartenaires';

export class PartnerTypeService {
  static async getAll(): Promise<PartnerType[]> {
    const result = await MicrosoftDataverseService.ListRecords(TABLE_NAME);
    
    console.log('[Service] result:', result);

    if (!result.success || !result.data?.value) {
      throw new Error('Échec Dataverse');
    }

    return result.data.value.map((item) => {
      const props = (item.dynamicProperties ?? item) as Record<string, unknown>;
      return {
        afb_typedepartenaireid: String(props.afb_typedepartenaireid ?? ''),
        afb_code: String(props.afb_code ?? ''),
        afb_libellefr: String(props.afb_libellefr ?? ''),
        afb_libelleen: props.afb_libelleen ? String(props.afb_libelleen) : undefined,
        afb_famille: Number(props.afb_famille ?? 0),
        afb_seuilubodefaut: Number(props.afb_seuilubodefaut ?? 0),
        afb_referenceguideafb: props.afb_referenceguideafb ? String(props.afb_referenceguideafb) : undefined,
        afb_actif: Boolean(props.afb_actif ?? false),
      };
    });
  }
}