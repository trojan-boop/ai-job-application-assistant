export async function extractTextFromPdf(file: File): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')

  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href

  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({ data }).promise

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(extractPageText(content.items))
  }

  return pages.join('\n\n').trim()
}

type PdfTextItem = {
  str: string
  transform: number[]
}

function extractPageText(items: unknown[]): string {
  let text = ''
  let lastY: number | null = null

  for (const item of items) {
    if (!item || typeof item !== 'object' || !('str' in item)) continue
    const { str, transform } = item as PdfTextItem
    if (!str) continue

    const y = transform?.[5] ?? null
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
      text += '\n'
    } else if (text && !text.endsWith('\n') && !text.endsWith(' ')) {
      text += ' '
    }

    text += str
    if (y !== null) lastY = y
  }

  return text
}
