function normalizePromptBarcode(value) {
  return String(value || "").replace(/\D/g, "");
}

export function buildMusicCdLookupPrompt(barcode) {
  const normalizedBarcode = normalizePromptBarcode(barcode);

  return `Busca información fiable sobre la edición musical en CD con código de barras ${normalizedBarcode}.

Identifica la edición exacta sin mezclar países, reediciones ni formatos. Contrasta el código en MusicBrainz, Discogs y, cuando exista, el catálogo oficial del sello.

Busca también la carátula frontal exacta de esa edición. Prioriza Cover Art Archive/MusicBrainz y después Discogs o el catálogo oficial del sello. No uses una carátula de otra edición aunque el título y el artista coincidan.

Devuelve exclusivamente un único bloque de código JSON, sin texto antes ni después, con esta estructura:
{
  "barcode": "${normalizedBarcode}",
  "productType": "Música",
  "title": null,
  "primaryArtist": null,
  "composer": null,
  "physicalFormat": "CD",
  "numberOfDiscs": null,
  "genre": null,
  "subgenre": null,
  "label": null,
  "releaseYear": null,
  "coverImageUrl": null,
  "productPageUrl": null,
  "verificationStatus": "unverified",
  "verificationNotes": null
}

coverImageUrl solo puede contener una URL HTTPS directa y pública de la carátula frontal correspondiente a esta edición. No uses páginas HTML, resultados de búsqueda, imágenes incrustadas como data: ni URL temporales. Si no encuentras una imagen directa verificable, devuelve null. Las URL deben ser texto plano, sin Markdown, espacios ni saltos de línea. No inventes datos. verificationStatus solo puede ser verified, partially_verified o unverified. Debe existir exactamente un objeto JSON y un único botón Copiar.`;
}

export function buildBookLookupPrompt(barcode) {
  const normalizedBarcode = normalizePromptBarcode(barcode);

  return `Busca información bibliográfica fiable sobre el libro con ISBN-13 ${normalizedBarcode}.

Comprueba el dígito de control e identifica exactamente la edición asociada al ISBN. No mezcles editoriales, idiomas, encuadernaciones, reimpresiones ni ediciones. Contrasta los datos en al menos dos fuentes fiables, priorizando editorial, Agencia ISBN o biblioteca nacional, WorldCat, Google Books y Open Library.

Busca también la imagen de la cubierta frontal exacta de ese ISBN. Prioriza la editorial, Google Books y Open Library. No uses la cubierta de otra edición aunque tenga el mismo título y autor.

Devuelve exclusivamente un único bloque de código JSON, sin texto antes ni después, con esta estructura:
{
  "barcode": "${normalizedBarcode}",
  "isbn13": "${normalizedBarcode}",
  "productType": "Libros",
  "title": null,
  "authors": [],
  "publisher": null,
  "publicationYear": null,
  "language": null,
  "pageCount": null,
  "category": null,
  "physicalFormat": null,
  "synopsis": null,
  "coverImageUrl": null,
  "productPageUrl": null,
  "verificationStatus": "unverified",
  "verificationNotes": null
}

Reglas:
- authors es un array de strings.
- publicationYear y pageCount son números o null.
- synopsis debe tener un máximo de 500 caracteres.
- coverImageUrl solo puede contener una URL HTTPS directa y pública de la cubierta frontal correspondiente exactamente a este ISBN.
- Una ficha de librería o página HTML no es una imagen. Si no encuentras una imagen directa verificable, devuelve null.
- No uses resultados de búsqueda, imágenes incrustadas como data: ni URL temporales.
- productPageUrl puede contener la página concreta de esta edición.
- Las URL deben ser texto plano, sin Markdown, espacios ni saltos de línea.
- No inventes datos; usa null cuando no puedas verificarlos.
- verificationStatus solo puede ser verified, partially_verified o unverified.
- Debe existir exactamente un objeto JSON y un único botón Copiar.`;
}
