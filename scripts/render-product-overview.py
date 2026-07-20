#!/usr/bin/env python3
"""Render a silent, full-screen ClaimFlow product walkthrough from browser captures."""

from __future__ import annotations

import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
CAPTURES = ROOT / "artifacts" / "claimflow-product-walkthrough"
OUTPUT = CAPTURES / "claimflow-product-overview.mp4"
FFMPEG = Path("/private/tmp/claimflow-ffmpeg/node_modules/ffmpeg-static/ffmpeg")

WIDTH = 1920
HEIGHT = 1080
FPS = 24
TRANSITION_SECONDS = 0.28

# Each scene is a real browser capture. Coordinates are normalized cursor targets.
SCENES = [
    ("01-landing.png", 2.8, (0.30, 0.43)),
    ("02-create-account.png", 3.0, (0.70, 0.58)),
    ("04-dashboard.png", 3.0, (0.88, 0.18)),
    ("05-new-claim-drawer.png", 3.0, (0.79, 0.34)),
    ("06-email-filled.png", 3.8, (0.79, 0.68)),
    ("07-preparing.png", 2.8, (0.73, 0.31)),
    ("08-validation-needs.png", 4.2, (0.49, 0.47)),
    ("09-policy-question.png", 3.2, (0.48, 0.73)),
    ("10-policy-evidence.png", 4.8, (0.48, 0.61)),
    ("11-agent-recommendation.png", 3.8, (0.48, 0.70)),
    ("12-agent-draft.png", 4.8, (0.48, 0.72)),
    ("13-waiting-for-info.png", 3.8, (0.50, 0.39)),
    ("14-information-filled.png", 4.8, (0.52, 0.72)),
    ("15-reopened-review.png", 4.2, (0.47, 0.48)),
    ("16-similar-claim-memory.png", 4.8, (0.44, 0.60)),
    ("17-memory-marked-useful.png", 3.4, (0.51, 0.69)),
    ("18-human-decision.png", 4.8, (0.55, 0.73)),
    ("19-resolved-summary.png", 4.4, (0.80, 0.18)),
    ("20-history-top.png", 3.8, (0.51, 0.55)),
    ("21-history-more.png", 3.6, (0.51, 0.67)),
    ("22-operations-trace-top.png", 4.8, (0.48, 0.43)),
    ("23-operations-trace-final.png", 4.2, (0.47, 0.67)),
    ("24-quality-reports.png", 3.8, (0.55, 0.43)),
    ("25-eval-detail.png", 3.8, (0.52, 0.48)),
    ("26-quality-checks.png", 4.0, (0.52, 0.62)),
]


def fit_full_frame(path: Path) -> Image.Image:
    """Fit without cropping, preserving the complete browser viewport."""
    image = Image.open(path).convert("RGB")
    scale = min(WIDTH / image.width, HEIGHT / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGB", (WIDTH, HEIGHT), "#fbfaf6")
    canvas.paste(resized, ((WIDTH - resized.width) // 2, (HEIGHT - resized.height) // 2))
    return canvas


def ease(value: float) -> float:
    value = min(1.0, max(0.0, value))
    return value * value * (3.0 - 2.0 * value)


def draw_cursor(frame: Image.Image, x: int, y: int, pulse: float) -> None:
    draw = ImageDraw.Draw(frame, "RGBA")
    if pulse > 0:
        radius = 18 + int(24 * pulse)
        alpha = int(150 * (1 - pulse))
        draw.ellipse(
            (x - radius, y - radius, x + radius, y + radius),
            outline=(18, 129, 117, alpha),
            width=5,
        )

    cursor = [
        (x, y),
        (x + 2, y + 38),
        (x + 11, y + 29),
        (x + 21, y + 52),
        (x + 31, y + 47),
        (x + 20, y + 25),
        (x + 37, y + 24),
    ]
    shadow = [(px + 4, py + 5) for px, py in cursor]
    draw.polygon(shadow, fill=(4, 52, 48, 85))
    draw.polygon(cursor, fill=(255, 255, 255, 255), outline=(8, 70, 64, 255), width=3)


def render() -> None:
    missing = [name for name, _, _ in SCENES if not (CAPTURES / name).exists()]
    if missing:
        raise FileNotFoundError(f"Missing captures: {', '.join(missing)}")
    if not FFMPEG.exists():
        raise FileNotFoundError(f"FFmpeg is not installed at {FFMPEG}")

    frames = [fit_full_frame(CAPTURES / name) for name, _, _ in SCENES]
    duration = sum(seconds for _, seconds, _ in SCENES)
    command = [
        str(FFMPEG),
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{WIDTH}x{HEIGHT}",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(OUTPUT),
    ]

    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None

    previous_target = SCENES[0][2]
    transition_frames = round(TRANSITION_SECONDS * FPS)
    try:
        for index, ((_, seconds, target), base) in enumerate(zip(SCENES, frames)):
            scene_frames = round(seconds * FPS)
            for frame_index in range(scene_frames):
                if index > 0 and frame_index < transition_frames:
                    alpha = ease((frame_index + 1) / transition_frames)
                    frame = Image.blend(frames[index - 1], base, alpha)
                else:
                    frame = base.copy()

                travel = ease(frame_index / max(1, round(0.72 * FPS)))
                cursor_x = round(
                    WIDTH * (previous_target[0] + (target[0] - previous_target[0]) * travel)
                )
                cursor_y = round(
                    HEIGHT * (previous_target[1] + (target[1] - previous_target[1]) * travel)
                )

                click_time = 0.86
                current_time = frame_index / FPS
                pulse = 0.0
                if click_time <= current_time <= click_time + 0.46:
                    pulse = (current_time - click_time) / 0.46
                draw_cursor(frame, cursor_x, cursor_y, pulse)
                process.stdin.write(frame.tobytes())
            previous_target = target
    finally:
        process.stdin.close()

    exit_code = process.wait()
    if exit_code != 0:
        raise RuntimeError(f"FFmpeg exited with code {exit_code}")

    print(f"Rendered {OUTPUT}")
    print(f"Duration: {duration:.1f}s · {WIDTH}x{HEIGHT} · {FPS}fps · silent")


if __name__ == "__main__":
    render()
