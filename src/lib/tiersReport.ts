// Génération d'un rapport PDF partenaire — mise en page soignée (logo Afriland
// au bon ratio, police Times, sections claires, pas de chevauchement).
import { jsPDF } from 'jspdf';
import logoUrl from '@/assets/afriland-logo.jpg';
import type { Dossier } from '@/lib/mockData';

/** Charge une image (URL Vite) en dataURL + dimensions naturelles pour jsPDF. */
async function loadImage(url: string): Promise<{ url: string; w: number; h: number } | null> {
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('logo'));
    });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d')?.drawImage(img, 0, 0);
    return { url: c.toDataURL('image/jpeg', 0.92), w: img.naturalWidth, h: img.naturalHeight };
  } catch {
    return null;
  }
}

export interface TiersReportData {
  dossier: Dossier;
  docs: Array<{ nom: string; type: string; statutLabel: string; date: string; expiration: string }>;
  checklist: Array<{ name: string; fourni: boolean; mandatory: boolean }>;
}

const RED: [number, number, number] = [200, 16, 46];
const INK: [number, number, number] = [35, 35, 35];
const GREY: [number, number, number] = [120, 120, 120];

export async function downloadTiersReport(data: TiersReportData): Promise<void> {
  const { dossier, docs, checklist } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const labelW = 58; // largeur colonne libellé
  const valueX = margin + labelW + 4; // début colonne valeur
  let y = 0;

  doc.setFont('times', 'normal');

  const ensure = (need = 8) => {
    if (y + need > pageH - 20) {
      doc.addPage();
      y = 22;
    }
  };
  const section = (title: string) => {
    ensure(16);
    y += 3;
    doc.setFont('times', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(...INK);
    doc.text(title.toUpperCase(), margin, y);
    y += 2.5;
    doc.setDrawColor(...RED);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
  };
  // Ligne libellé/valeur avec retour à la ligne (aucun chevauchement).
  const row = (label: string, value?: string | number | null, valueColor?: [number, number, number]) => {
    const labelLines = doc.splitTextToSize(label, labelW) as string[];
    const valLines = doc.splitTextToSize(String(value ?? '—'), pageW - valueX - margin) as string[];
    const n = Math.max(labelLines.length, valLines.length);
    ensure(n * 5 + 2);
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...GREY);
    doc.text(labelLines, margin, y);
    doc.setTextColor(...(valueColor ?? INK));
    doc.text(valLines, valueX, y);
    y += n * 5 + 1.5;
  };

  // ---------- En-tête ----------
  // Bandeau rouge fin en haut
  doc.setFillColor(...RED);
  doc.rect(0, 0, pageW, 3, 'F');
  y = 16;

  const logo = await loadImage(logoUrl);
  if (logo) {
    const hMM = 13; // hauteur cible
    const wMM = Math.min(45, (logo.w / logo.h) * hMM); // largeur au bon ratio
    doc.addImage(logo.url, 'JPEG', margin, y - 3, wMM, hMM);
  }
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text('Rapport partenaire — KYP / KYS', pageW - margin, y + 2, { align: 'right' });
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...GREY);
  doc.text('Afriland First Bank — Direction de la Conformité', pageW - margin, y + 8, { align: 'right' });
  y += 16;
  doc.setDrawColor(210);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  // ---------- Titre partenaire ----------
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...RED);
  doc.text(dossier.entite, margin, y);
  y += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...GREY);
  doc.text(`${dossier.id}    ·    ${dossier.type}    ·    Statut : ${dossier.statut}`, margin, y);
  y += 4;

  // ---------- Sections ----------
  section('Identité');
  row('Raison sociale', dossier.entite);
  row('Forme juridique', dossier.onboarding?.formeJuridique);
  row("Secteur d'activité", dossier.onboarding?.secteur);
  row('RCCM / Immatriculation', dossier.onboarding?.rccm);
  row('Pays', dossier.pays);
  row('Ville', dossier.onboarding?.ville);
  row('Adresse', dossier.onboarding?.adresse);
  row('E-mail de contact', dossier.email);
  row('Téléphone', dossier.onboarding?.telephone);
  row('Code SWIFT / BIC', dossier.onboarding?.swift);
  row('Chargé de relation', dossier.charge);

  section('Évaluation du risque');
  row('Niveau de risque', dossier.risque);
  row('Direction porteuse', dossier.direction);
  row('Date de création', dossier.dateCreation);

  section(`Documents déposés (${docs.length})`);
  if (!docs.length) {
    ensure();
    doc.setTextColor(...GREY);
    doc.text('Aucun document déposé.', margin, y);
    y += 6;
  } else {
    docs.forEach((d) => row(d.nom, `${d.statutLabel}  ·  déposé le ${d.date}`));
  }

  section('Pièces attendues');
  checklist.forEach((c) =>
    row(
      c.name,
      c.fourni ? 'Fourni' : c.mandatory ? 'Manquant' : 'Optionnel',
      c.fourni ? [21, 128, 61] : c.mandatory ? RED : GREY,
    ),
  );

  section('Conclusion — Direction de la Conformité');
  row('Statut du dossier', dossier.statut);
  ensure(20);
  doc.setTextColor(...INK);
  doc.setFontSize(10.5);
  const comment = doc.splitTextToSize(
    dossier.commentaire ?? 'Aucun commentaire enregistré pour ce dossier.',
    pageW - 2 * margin,
  ) as string[];
  doc.text(comment, margin, y);

  // ---------- Pied de page (toutes les pages) ----------
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(220);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')} — Document confidentiel — Conservation 10 ans (Art. 38 COBAC R-2023/01)`,
      margin,
      pageH - 9,
    );
    doc.text(`Page ${p} / ${total}`, pageW - margin, pageH - 9, { align: 'right' });
  }

  doc.save(`rapport-${dossier.id}.pdf`);
}
