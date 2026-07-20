import Foundation
import AVFoundation
import CoreGraphics
import CoreVideo
import ImageIO

struct Scene: Codable {
    let image: String
    let title: String
    let subtitle: String
    let duration: Double
}

enum RenderError: Error, CustomStringConvertible {
    case message(String)
    var description: String {
        switch self { case .message(let text): return text }
    }
}

func loadImage(_ url: URL) throws -> CGImage {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        throw RenderError.message("Could not load image at \(url.path)")
    }
    return image
}

func drawImage(_ image: CGImage, in context: CGContext, width: Int, height: Int, scale: CGFloat, alpha: CGFloat) {
    let drawWidth = CGFloat(width) * scale
    let drawHeight = CGFloat(height) * scale
    let x = (CGFloat(width) - drawWidth) / 2
    let y = (CGFloat(height) - drawHeight) / 2
    context.saveGState()
    context.setAlpha(alpha)
    context.draw(image, in: CGRect(x: x, y: y, width: drawWidth, height: drawHeight))
    context.restoreGState()
}

func makePixelBuffer(pool: CVPixelBufferPool, current: CGImage, next: CGImage?, progress: Double, transition: Double, width: Int, height: Int) throws -> CVPixelBuffer {
    var maybeBuffer: CVPixelBuffer?
    let status = CVPixelBufferPoolCreatePixelBuffer(nil, pool, &maybeBuffer)
    guard status == kCVReturnSuccess, let buffer = maybeBuffer else {
        throw RenderError.message("Could not allocate video frame")
    }
    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
    guard let base = CVPixelBufferGetBaseAddress(buffer) else {
        throw RenderError.message("Missing pixel buffer base address")
    }
    let bytesPerRow = CVPixelBufferGetBytesPerRow(buffer)
    guard let context = CGContext(
        data: base,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: bytesPerRow,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    ) else {
        throw RenderError.message("Could not create frame drawing context")
    }
    context.setFillColor(CGColor(red: 0.984, green: 0.98, blue: 0.965, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.translateBy(x: 0, y: CGFloat(height))
    context.scaleBy(x: 1, y: -1)
    let currentScale = 1.0 + CGFloat(progress) * 0.018
    if transition > 0, let nextImage = next {
        drawImage(current, in: context, width: width, height: height, scale: currentScale, alpha: CGFloat(1.0 - transition))
        drawImage(nextImage, in: context, width: width, height: height, scale: 1.0 + CGFloat(transition) * 0.004, alpha: CGFloat(transition))
    } else {
        drawImage(current, in: context, width: width, height: height, scale: currentScale, alpha: 1)
    }
    return buffer
}

func renderSilentVideo(root: URL, scenes: [Scene], output: URL) throws {
    try? FileManager.default.removeItem(at: output)
    let width = 1920
    let height = 1080
    let fps: Int32 = 30
    let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
    let settings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: 8_000_000,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
        ]
    ]
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    input.expectsMediaDataInRealTime = false
    let attributes: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height
    ]
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: attributes)
    guard writer.canAdd(input) else { throw RenderError.message("Video input is not supported") }
    writer.add(input)
    guard writer.startWriting() else { throw writer.error ?? RenderError.message("Video writer failed to start") }
    writer.startSession(atSourceTime: .zero)
    guard let pool = adaptor.pixelBufferPool else { throw RenderError.message("Pixel buffer pool is unavailable") }
    let frames = try scenes.enumerated().map { index, scene in
        try loadImage(root.appendingPathComponent("frames/scene-\(String(format: "%02d", index + 1)).png"))
    }
    var absoluteFrame: Int64 = 0
    let transitionSeconds = 0.65
    for (sceneIndex, scene) in scenes.enumerated() {
        let sceneFrameCount = Int64((scene.duration * Double(fps)).rounded())
        let transitionFrames = Int64(transitionSeconds * Double(fps))
        for localFrame in 0..<sceneFrameCount {
            while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
            let progress = Double(localFrame) / Double(max(sceneFrameCount - 1, 1))
            let transition: Double
            if sceneIndex < scenes.count - 1 && localFrame >= sceneFrameCount - transitionFrames {
                transition = Double(localFrame - (sceneFrameCount - transitionFrames)) / Double(max(transitionFrames - 1, 1))
            } else {
                transition = 0
            }
            let buffer = try makePixelBuffer(
                pool: pool,
                current: frames[sceneIndex],
                next: sceneIndex < frames.count - 1 ? frames[sceneIndex + 1] : nil,
                progress: progress,
                transition: transition,
                width: width,
                height: height
            )
            let time = CMTime(value: absoluteFrame, timescale: fps)
            if !adaptor.append(buffer, withPresentationTime: time) {
                throw writer.error ?? RenderError.message("Could not append video frame")
            }
            absoluteFrame += 1
        }
    }
    input.markAsFinished()
    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting { semaphore.signal() }
    semaphore.wait()
    guard writer.status == .completed else {
        throw writer.error ?? RenderError.message("Video writer did not complete")
    }
}

func muxAudio(videoURL: URL, audioURL: URL, outputURL: URL) throws {
    try? FileManager.default.removeItem(at: outputURL)
    let videoAsset = AVURLAsset(url: videoURL)
    let audioAsset = AVURLAsset(url: audioURL)
    let composition = AVMutableComposition()
    guard let sourceVideo = videoAsset.tracks(withMediaType: .video).first,
          let compositionVideo = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
        throw RenderError.message("Could not load the silent video track")
    }
    try compositionVideo.insertTimeRange(CMTimeRange(start: .zero, duration: videoAsset.duration), of: sourceVideo, at: .zero)
    compositionVideo.preferredTransform = sourceVideo.preferredTransform
    if let sourceAudio = audioAsset.tracks(withMediaType: .audio).first,
       let compositionAudio = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
        let audioDuration = CMTimeMinimum(audioAsset.duration, videoAsset.duration)
        try compositionAudio.insertTimeRange(CMTimeRange(start: .zero, duration: audioDuration), of: sourceAudio, at: .zero)
    }
    guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
        throw RenderError.message("Could not create the final video exporter")
    }
    exporter.outputURL = outputURL
    exporter.outputFileType = .mp4
    exporter.shouldOptimizeForNetworkUse = true
    let semaphore = DispatchSemaphore(value: 0)
    exporter.exportAsynchronously { semaphore.signal() }
    semaphore.wait()
    guard exporter.status == .completed else {
        throw exporter.error ?? RenderError.message("Final video export did not complete")
    }
}

let root = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : FileManager.default.currentDirectoryPath)
let storyboardURL = root.appendingPathComponent("storyboard.json")
let silentURL = root.appendingPathComponent("claimflow-showcase-silent.mp4")
let narrationURL = root.appendingPathComponent("narration.aiff")
let outputURL = root.appendingPathComponent("claimflow-ai-product-story-90s.mp4")

do {
    let scenes = try JSONDecoder().decode([Scene].self, from: Data(contentsOf: storyboardURL))
    let total = scenes.reduce(0) { $0 + $1.duration }
    guard abs(total - 90.0) < 0.001 else { throw RenderError.message("Storyboard must total exactly 90 seconds; found \(total)") }
    print("Rendering \(scenes.count) scenes across \(Int(total)) seconds…")
    try renderSilentVideo(root: root, scenes: scenes, output: silentURL)
    try muxAudio(videoURL: silentURL, audioURL: narrationURL, outputURL: outputURL)
    print("Created \(outputURL.path)")
} catch {
    fputs("Render failed: \(error)\n", stderr)
    exit(1)
}
