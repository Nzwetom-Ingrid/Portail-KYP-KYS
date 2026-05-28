// Post-build: lowercase tous les fichiers de dist/ et patche les references
// croisees (index.html, chunks JS, CSS). Necessaire pour Power Pages qui
// normalise les URL des Web Files en minuscules: sans cette etape, le
// navigateur recoit des 404 sur /assets/index-CZ_c6Fzg.js, etc.
//
// Usage: `node scripts/lowercase-dist.mjs` (declenche automatiquement
// par `npm run build`).

import { readdirSync, statSync, renameSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../dist/', import.meta.url))
const TEXT_EXTS = /\.(html|js|mjs|cjs|css|map|json|svg|txt|webmanifest)$/i

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      walk(full, files)
    } else {
      files.push(full)
    }
  }
  return files
}

let allFiles
try {
  allFiles = walk(DIST)
} catch (err) {
  if (err.code === 'ENOENT') {
    console.warn(`[lowercase-dist] dist/ introuvable (${DIST}). Skip.`)
    process.exit(0)
  }
  throw err
}

// 1) Collecte les renames a faire (basename != lowercase).
const renameMap = []
for (const full of allFiles) {
  const name = basename(full)
  const lower = name.toLowerCase()
  if (name !== lower) {
    renameMap.push({
      fromBasename: name,
      toBasename: lower,
      fromFull: full,
      toFull: join(dirname(full), lower),
    })
  }
}

// 2) Patche les references AVANT de renommer (les chemins absolus sont
// encore valides). On replace par basename pour ne pas confondre des
// fichiers homonymes a des emplacements differents (improbable mais safe).
const textFiles = allFiles.filter((f) => TEXT_EXTS.test(f))
let patchedCount = 0
for (const file of textFiles) {
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue // binaire mal-detecte
  }
  const original = content
  for (const { fromBasename, toBasename } of renameMap) {
    if (fromBasename === toBasename) continue
    const escaped = fromBasename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    content = content.replace(new RegExp(escaped, 'g'), toBasename)
  }
  if (content !== original) {
    writeFileSync(file, content)
    patchedCount++
    console.log(`[lowercase-dist] patched: ${relative(DIST, file)}`)
  }
}

// 3) Renomme du plus profond au moins profond pour gerer les dossiers en
// mixed-case (improbable ici, mais robuste). Sur NTFS, rename direct est
// case-insensitive: on passe par un tmp pour forcer la maj du nom.
renameMap.sort((a, b) => b.fromFull.length - a.fromFull.length)
for (const { fromFull, toFull, fromBasename, toBasename } of renameMap) {
  const tmp = fromFull + '.__case_tmp__'
  renameSync(fromFull, tmp)
  renameSync(tmp, toFull)
  console.log(`[lowercase-dist] renamed: ${fromBasename} -> ${toBasename}`)
}

console.log(`[lowercase-dist] done. ${renameMap.length} file(s) renamed, ${patchedCount} file(s) patched.`)
