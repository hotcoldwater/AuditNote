import Foundation
import Vision
import CoreGraphics
import ImageIO

struct ImagePayload: Encodable {
  let path: String
  let text: String
}

func recognizeText(at path: String) throws -> String {
  let url = URL(fileURLWithPath: path)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    throw NSError(domain: "ocr", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to open image"])
  }

  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true
  request.recognitionLanguages = ["ko-KR", "en-US"]

  let handler = VNImageRequestHandler(cgImage: image, options: [:])
  try handler.perform([request])

  let observations = request.results ?? []
  return observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
}

let paths = Array(CommandLine.arguments.dropFirst())
guard !paths.isEmpty else {
  fputs("Usage: swift scripts/ocrImages.swift <image> [image...]\n", stderr)
  exit(1)
}

let payload = try paths.map { path in
  ImagePayload(path: path, text: try recognizeText(at: path))
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .withoutEscapingSlashes]
let data = try encoder.encode(payload)
FileHandle.standardOutput.write(data)
