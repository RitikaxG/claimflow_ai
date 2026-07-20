#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <CoreGraphics/CoreGraphics.h>
#import <CoreVideo/CoreVideo.h>
#import <ImageIO/ImageIO.h>

static CGImageRef LoadImage(NSURL *url) {
    CGImageSourceRef source = CGImageSourceCreateWithURL((__bridge CFURLRef)url, NULL);
    if (!source) return NULL;
    CGImageRef image = CGImageSourceCreateImageAtIndex(source, 0, NULL);
    CFRelease(source);
    return image;
}

static void DrawImage(CGContextRef context, CGImageRef image, int width, int height, CGFloat scale, CGFloat alpha) {
    CGFloat drawWidth = width * scale;
    CGFloat drawHeight = height * scale;
    CGRect rect = CGRectMake((width - drawWidth) / 2.0, (height - drawHeight) / 2.0, drawWidth, drawHeight);
    CGContextSaveGState(context);
    CGContextSetAlpha(context, alpha);
    CGContextDrawImage(context, rect, image);
    CGContextRestoreGState(context);
}

static CVPixelBufferRef MakeFrame(CVPixelBufferPoolRef pool, CGImageRef current, CGImageRef next, double progress, double transition, int width, int height) {
    CVPixelBufferRef buffer = NULL;
    if (CVPixelBufferPoolCreatePixelBuffer(NULL, pool, &buffer) != kCVReturnSuccess) return NULL;
    CVPixelBufferLockBaseAddress(buffer, 0);
    void *base = CVPixelBufferGetBaseAddress(buffer);
    size_t bytesPerRow = CVPixelBufferGetBytesPerRow(buffer);
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    CGContextRef context = CGBitmapContextCreate(base, width, height, 8, bytesPerRow, colorSpace, kCGImageAlphaPremultipliedFirst | kCGBitmapByteOrder32Little);
    CGColorSpaceRelease(colorSpace);
    if (!context) {
        CVPixelBufferUnlockBaseAddress(buffer, 0);
        CVPixelBufferRelease(buffer);
        return NULL;
    }
    CGContextSetRGBFillColor(context, 0.984, 0.98, 0.965, 1.0);
    CGContextFillRect(context, CGRectMake(0, 0, width, height));
    CGContextTranslateCTM(context, 0, height);
    CGContextScaleCTM(context, 1, -1);
    CGFloat currentScale = 1.0 + progress * 0.018;
    if (transition > 0 && next) {
        DrawImage(context, current, width, height, currentScale, 1.0 - transition);
        DrawImage(context, next, width, height, 1.0 + transition * 0.004, transition);
    } else {
        DrawImage(context, current, width, height, currentScale, 1.0);
    }
    CGContextRelease(context);
    CVPixelBufferUnlockBaseAddress(buffer, 0);
    return buffer;
}

static BOOL RenderSilent(NSURL *root, NSArray<NSDictionary *> *scenes, NSURL *output, NSError **error) {
    [[NSFileManager defaultManager] removeItemAtURL:output error:nil];
    const int width = 1920, height = 1080, fps = 5;
    AVAssetWriter *writer = [[AVAssetWriter alloc] initWithURL:output fileType:AVFileTypeQuickTimeMovie error:error];
    if (!writer) return NO;
    NSDictionary *settings = @{AVVideoCodecKey:AVVideoCodecTypeAppleProRes422LT, AVVideoWidthKey:@(width), AVVideoHeightKey:@(height)};
    AVAssetWriterInput *input = [AVAssetWriterInput assetWriterInputWithMediaType:AVMediaTypeVideo outputSettings:settings];
    input.expectsMediaDataInRealTime = NO;
    NSDictionary *attrs = @{(NSString *)kCVPixelBufferPixelFormatTypeKey:@(kCVPixelFormatType_32BGRA), (NSString *)kCVPixelBufferWidthKey:@(width), (NSString *)kCVPixelBufferHeightKey:@(height)};
    AVAssetWriterInputPixelBufferAdaptor *adaptor = [AVAssetWriterInputPixelBufferAdaptor assetWriterInputPixelBufferAdaptorWithAssetWriterInput:input sourcePixelBufferAttributes:attrs];
    if (![writer canAddInput:input]) return NO;
    [writer addInput:input];
    if (![writer startWriting]) { if (error) *error = writer.error; return NO; }
    [writer startSessionAtSourceTime:kCMTimeZero];
    NSMutableArray *images = [NSMutableArray array];
    for (NSInteger i = 0; i < scenes.count; i++) {
        NSString *name = [NSString stringWithFormat:@"frames/scene-%02ld.png", (long)i + 1];
        CGImageRef image = LoadImage([root URLByAppendingPathComponent:name]);
        if (!image) return NO;
        [images addObject:(__bridge id)image];
        CGImageRelease(image);
    }
    int64_t absoluteFrame = 0;
    int64_t transitionFrames = MAX((int64_t)2, (int64_t)llround(0.8 * fps));
    for (NSInteger sceneIndex = 0; sceneIndex < scenes.count; sceneIndex++) {
        NSDictionary *scene = scenes[sceneIndex];
        int64_t sceneFrames = (int64_t)llround([scene[@"duration"] doubleValue] * fps);
        CGImageRef current = (__bridge CGImageRef)images[sceneIndex];
        CGImageRef next = sceneIndex + 1 < images.count ? (__bridge CGImageRef)images[sceneIndex + 1] : NULL;
        for (int64_t localFrame = 0; localFrame < sceneFrames; localFrame++) {
            while (!input.readyForMoreMediaData) [NSThread sleepForTimeInterval:0.002];
            double progress = (double)localFrame / MAX((double)sceneFrames - 1, 1);
            double transition = 0;
            if (next && localFrame >= sceneFrames - transitionFrames) {
                transition = (double)(localFrame - (sceneFrames - transitionFrames)) / MAX((double)transitionFrames - 1, 1);
            }
            CVPixelBufferRef buffer = MakeFrame(adaptor.pixelBufferPool, current, next, progress, transition, width, height);
            if (!buffer) return NO;
            BOOL ok = [adaptor appendPixelBuffer:buffer withPresentationTime:CMTimeMake(absoluteFrame, fps)];
            CVPixelBufferRelease(buffer);
            if (!ok) { if (error) *error = writer.error; return NO; }
            absoluteFrame++;
        }
    }
    [input markAsFinished];
    dispatch_semaphore_t sem = dispatch_semaphore_create(0);
    [writer finishWritingWithCompletionHandler:^{ dispatch_semaphore_signal(sem); }];
    dispatch_semaphore_wait(sem, DISPATCH_TIME_FOREVER);
    if (writer.status != AVAssetWriterStatusCompleted) { if (error) *error = writer.error; return NO; }
    return YES;
}

static BOOL MuxAudio(NSURL *videoURL, NSURL *audioURL, NSURL *outputURL, NSError **error) {
    [[NSFileManager defaultManager] removeItemAtURL:outputURL error:nil];
    AVURLAsset *video = [AVURLAsset URLAssetWithURL:videoURL options:nil];
    AVURLAsset *audio = [AVURLAsset URLAssetWithURL:audioURL options:nil];
    AVMutableComposition *composition = [AVMutableComposition composition];
    AVAssetTrack *sourceVideo = [[video tracksWithMediaType:AVMediaTypeVideo] firstObject];
    AVMutableCompositionTrack *videoTrack = [composition addMutableTrackWithMediaType:AVMediaTypeVideo preferredTrackID:kCMPersistentTrackID_Invalid];
    if (!sourceVideo || !videoTrack) return NO;
    if (![videoTrack insertTimeRange:CMTimeRangeMake(kCMTimeZero, video.duration) ofTrack:sourceVideo atTime:kCMTimeZero error:error]) return NO;
    videoTrack.preferredTransform = sourceVideo.preferredTransform;
    AVAssetTrack *sourceAudio = [[audio tracksWithMediaType:AVMediaTypeAudio] firstObject];
    AVMutableCompositionTrack *audioTrack = [composition addMutableTrackWithMediaType:AVMediaTypeAudio preferredTrackID:kCMPersistentTrackID_Invalid];
    if (sourceAudio && audioTrack) {
        CMTime audioDuration = CMTimeCompare(audio.duration, video.duration) < 0 ? audio.duration : video.duration;
        if (![audioTrack insertTimeRange:CMTimeRangeMake(kCMTimeZero, audioDuration) ofTrack:sourceAudio atTime:kCMTimeZero error:error]) return NO;
    }
    AVAssetExportSession *exporter = [[AVAssetExportSession alloc] initWithAsset:composition presetName:AVAssetExportPresetPassthrough];
    exporter.outputURL = outputURL;
    exporter.outputFileType = AVFileTypeQuickTimeMovie;
    exporter.shouldOptimizeForNetworkUse = YES;
    dispatch_semaphore_t sem = dispatch_semaphore_create(0);
    [exporter exportAsynchronouslyWithCompletionHandler:^{ dispatch_semaphore_signal(sem); }];
    dispatch_semaphore_wait(sem, DISPATCH_TIME_FOREVER);
    if (exporter.status != AVAssetExportSessionStatusCompleted) { if (error) *error = exporter.error; return NO; }
    return YES;
}

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSString *rootPath = argc > 1 ? [NSString stringWithUTF8String:argv[1]] : [[NSFileManager defaultManager] currentDirectoryPath];
        NSURL *root = [NSURL fileURLWithPath:rootPath isDirectory:YES];
        NSData *data = [NSData dataWithContentsOfURL:[root URLByAppendingPathComponent:@"storyboard.json"]];
        NSError *error = nil;
        NSArray<NSDictionary *> *scenes = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
        if (!scenes || error) { fprintf(stderr, "Could not read storyboard: %s\n", error.localizedDescription.UTF8String); return 1; }
        double total = 0; for (NSDictionary *scene in scenes) total += [scene[@"duration"] doubleValue];
        if (fabs(total - 90.0) > 0.001) { fprintf(stderr, "Storyboard is %.2f seconds, expected 90\n", total); return 1; }
        NSURL *silent = [root URLByAppendingPathComponent:@"claimflow-showcase-silent.mov"];
        NSURL *audio = [root URLByAppendingPathComponent:@"narration.aiff"];
        NSURL *output = [root URLByAppendingPathComponent:@"claimflow-ai-product-story-90s.mov"];
        printf("Rendering %ld scenes across 90 seconds…\n", (long)scenes.count);
        if (!RenderSilent(root, scenes, silent, &error)) { fprintf(stderr, "Silent render failed: %s | %s\n", error.localizedDescription.UTF8String, error.userInfo.description.UTF8String); return 1; }
        if (!MuxAudio(silent, audio, output, &error)) { fprintf(stderr, "Audio export failed: %s | %s\n", error.localizedDescription.UTF8String, error.userInfo.description.UTF8String); return 1; }
        printf("Created %s\n", output.path.UTF8String);
    }
    return 0;
}
