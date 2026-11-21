/**
 * Photographers of the Pexels photos used on the "Как работим" pages, in the order the original
 * footer credited them. The footer line is built from this list, so it always matches the photos.
 *
 * The original photo files were missing on the original server (404, issue G-05); replacements were
 * sourced from Pexels by these same photographers, one photo each:
 *   Antoni Shkraba    — izpalnenie-3  pexels.com/photo/5493652
 *   Pavel Danilyuk    — ogled-2       pexels.com/photo/7937668
 *   Jakub Zerdzicki   — dogovor-2     pexels.com/photo/31651009
 *   Vladimir Srajber  — izpalnenie-1  pexels.com/photo/11806482
 *   Ksenia Chernaya   — ogled-1       pexels.com/photo/5691675
 *   Anete Lusina      — pochistvane-1 pexels.com/photo/4792771
 *   Liliana Drew      — pochistvane-2 pexels.com/photo/9462101
 */
export const PHOTOGRAPHERS = [
  'Antoni Shkraba',
  'Pavel Danilyuk',
  'Jakub Zerdzicki',
  'Vladimir Srajber',
  'Ksenia Chernaya',
  'Anete Lusina',
  'Liliana Drew',
] as const;

export const stepsPhotoCredits = `Снимки: ${PHOTOGRAPHERS.join(', ')} от Pexels.`;
