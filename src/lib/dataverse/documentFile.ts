import { MicrosoftDataverseService } from '@/generated/services/MicrosoftDataverseService';

export interface DocFile {
  url?: string;
  base64?: string;
  mimetype?: string;
  filename?: string;
}

// URL de l'organisation Dataverse (env DEV AFB-KYP-KYS). La variante « current
// environment » de ListRecords renvoie « Invalid organization URL 'null' » pour
// une table ad-hoc dans un Code App ; on passe donc l'org explicitement via
// ListRecordsWithOrganization.
const ORG_URL = 'https://org40a0a528.crm12.dynamics.com';

/**
 * Récupère le binaire d'un document (aperçu / téléchargement) côté back-office.
 *
 * Le Code App n'a PAS de data source « annotation » générée, mais peut la lire
 * via l'action générique « List rows (selected environment) » du connecteur
 * Dataverse (MicrosoftDataverseService.ListRecordsWithOrganization) — aucune
 * data source dédiée requise.
 *
 * On NE retombe PAS silencieusement sur l'URL SharePoint (souvent 404 en DEV) :
 * si l'annotation est illisible, on remonte la VRAIE raison pour diagnostiquer.
 */
export async function getDocumentBinary(
  documentId: string,
  sharepointUrl?: string,
  fallbackName?: string,
): Promise<DocFile> {
  let diag = '';
  try {
    const res = await MicrosoftDataverseService.ListRecordsWithOrganization(
      ORG_URL,                  // organization
      'annotations',            // entityName (nom de collection)
      undefined,                // prefer
      undefined,                // accept
      undefined,                // x-ms-odata-metadata-full
      undefined,                // MSCRM.IncludeMipSensitivityLabel
      'documentbody,mimetype,filename', // $select
      `_objectid_value eq ${documentId} and isdocument eq true`, // $filter
      'createdon desc',         // $orderby
      undefined,                // $expand
      undefined,                // fetchXml
      1,                        // $top
    );
    if (!res.success) {
      diag = `connecteur: ${res.error?.message ?? 'success=false'}`;
    } else {
      const data = res.data as { value?: unknown[] } | undefined;
      const items = (data?.value ?? []) as Array<
        Record<string, unknown> & { dynamicProperties?: Record<string, unknown> }
      >;
      if (!items.length) {
        diag = `0 pièce jointe (doc ${documentId})`;
      } else {
        const raw = items[0];
        // Selon le SDK, les colonnes arrivent soit à plat, soit sous dynamicProperties.
        const rec = (raw.dynamicProperties ?? raw) as Record<string, unknown>;
        const body = (rec.documentbody ?? raw.documentbody) as string | undefined;
        if (body) {
          return {
            base64: body,
            mimetype: (rec.mimetype as string) || 'application/octet-stream',
            filename: (rec.filename as string) || fallbackName || 'document',
          };
        }
        diag = `annotation sans documentbody (clés: ${Object.keys(rec).join('|')})`;
      }
    }
  } catch (e) {
    diag = e instanceof Error ? e.message : String(e);
  }
  throw new Error(`Pièce illisible [sharepoint=${sharepointUrl || '—'}] — ${diag}`);
}

/** base64 → Blob pour aperçu/téléchargement dans le navigateur. */
export function base64ToBlob(b64: string, mimetype: string): Blob {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64;
  const bytes = atob(clean);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimetype });
}

/** Lit un File en base64 (sans le préfixe « data:… , »). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      resolve(s.includes(',') ? s.split(',')[1] : s);
    };
    r.onerror = () => reject(r.error ?? new Error('Lecture du fichier échouée.'));
    r.readAsDataURL(file);
  });
}

/**
 * Attache un fichier binaire à un document afb_document sous forme d'annotation
 * (pièce jointe), via le connecteur Dataverse générique (variante WithOrganization
 * — même contrainte d'org explicite que la lecture, cf. ORG_URL ci-dessus).
 */
export async function attachFileToDocument(documentId: string, file: File): Promise<void> {
  const documentbody = await fileToBase64(file);
  const res = await MicrosoftDataverseService.CreateRecordWithOrganization(
    'return=representation', // prefer
    'application/json',      // accept
    ORG_URL,                 // organization
    'annotations',           // entityName
    {
      'objectid_afb_document@odata.bind': `/afb_documents(${documentId})`,
      subject: 'Document partagé',
      filename: file.name,
      mimetype: file.type || 'application/octet-stream',
      documentbody,
      isdocument: true,
    },
  );
  if (!res.success) {
    throw new Error(`Pièce jointe non enregistrée : ${res.error?.message ?? 'échec connecteur'}`);
  }
}
