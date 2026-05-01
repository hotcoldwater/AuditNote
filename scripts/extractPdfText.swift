import Foundation
import PDFKit

struct PagePayload: Encodable {
  let pageIndex: Int
  let text: String
}

guard CommandLine.arguments.count >= 2 else {
  fputs("Usage: swift scripts/extractPdfText.swift <pdf-path> [page-start] [page-end]\n", stderr)
  exit(1)
}

let pdfPath = CommandLine.arguments[1]
let pageStart = CommandLine.arguments.count >= 3 ? max(Int(CommandLine.arguments[2]) ?? 1, 1) : 1
let pageEndArg = CommandLine.arguments.count >= 4 ? Int(CommandLine.arguments[3]) : nil

guard let document = PDFDocument(url: URL(fileURLWithPath: pdfPath)) else {
  fputs("Failed to open PDF: \(pdfPath)\n", stderr)
  exit(1)
}

let lastPage = document.pageCount
let pageEnd = min(pageEndArg ?? lastPage, lastPage)

var payload: [PagePayload] = []

if pageStart <= pageEnd {
  for humanIndex in pageStart...pageEnd {
    let zeroIndex = humanIndex - 1
    let text = document.page(at: zeroIndex)?.string ?? ""
    payload.append(PagePayload(pageIndex: humanIndex, text: text))
  }
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .withoutEscapingSlashes]
let data = try encoder.encode(payload)
FileHandle.standardOutput.write(data)
