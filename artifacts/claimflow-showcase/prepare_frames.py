from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
W, H = 1920, 1080
INK = "#153F3A"
TEAL = "#16877D"
TEAL_DARK = "#0F4F49"
MINT = "#DDF2EC"
WARM = "#FBFAF6"
LINE = "#DCE9E5"
TEXT = "#1F3733"
MUTED = "#667A76"
AMBER = "#D98B2B"
WHITE = "#FFFFFF"


def font(size: int, bold: bool = False):
    path = "/System/Library/Fonts/SFNS.ttf"
    return ImageFont.truetype(path, size=size, layout_engine=ImageFont.Layout.RAQM)


def fit_crop(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = image.convert("RGB")
    ratio = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def card(draw: ImageDraw.ImageDraw, box, fill=WHITE, outline=LINE, radius=24, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def pill(draw: ImageDraw.ImageDraw, xy, label: str, fill=MINT, color=TEAL_DARK):
    x, y = xy
    f = font(26, True)
    bbox = draw.textbbox((0, 0), label, font=f)
    w = bbox[2] + 42
    draw.rounded_rectangle((x, y, x + w, y + 48), radius=24, fill=fill)
    draw.text((x + 21, y + 8), label, font=f, fill=color)
    return w


def app_shell(title: str, subtitle: str) -> Image.Image:
    im = Image.new("RGB", (1440, 900), WARM)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 250, 900), fill="#EAF6F2")
    d.text((30, 32), "C", font=font(56, True), fill=TEAL_DARK)
    d.text((82, 46), "ClaimFlow", font=font(26, True), fill=INK)
    nav = [(122, "Claims"), (186, "Review queue"), (250, "Resolved"), (330, "Operations")]
    for y, label in nav:
        if label in ("Resolved", "Operations"):
            d.rounded_rectangle((18, y - 14, 232, y + 34), radius=14, fill=TEAL if label == title else "#EAF6F2")
        d.text((60, y), label, font=font(21, label == title), fill=WHITE if label == title else MUTED)
    d.line((250, 72, 1440, 72), fill=LINE, width=2)
    d.rounded_rectangle((335, 18, 840, 56), radius=18, fill=WHITE, outline=LINE)
    d.text((360, 28), "Search claims", font=font(18), fill=MUTED)
    d.text((300, 110), title, font=font(42, True), fill=INK)
    d.text((300, 162), subtitle, font=font(22), fill=MUTED)
    return im


def make_resolution():
    im = app_shell("Resolved", "A complete decision record, ready for audit.")
    d = ImageDraw.Draw(im)
    card(d, (300, 220, 1395, 830))
    pill(d, (1200, 250), "Approved")
    d.text((345, 255), "CLM-W2-006 · Nikhil Rao", font=font(32, True), fill=INK)
    d.text((345, 303), "Vehicle theft · Tata Nexon · KA03MN7788", font=font(21), fill=MUTED)
    d.line((345, 352, 1350, 352), fill=LINE, width=2)
    steps = [
        ("Claim received", "Email and supporting document recorded"),
        ("Facts verified", "FIR number matched the claimant response"),
        ("Decision edited", "Reviewer corrected the prepared claim"),
        ("Approved by Maya Shah", "Human decision · 20 Jul 2026, 14:18"),
    ]
    y = 390
    for heading, body in steps:
        d.ellipse((350, y, 386, y + 36), fill=MINT, outline="#A7DDD4", width=2)
        d.text((359, y + 3), "✓", font=font(23, True), fill=TEAL)
        d.text((412, y - 2), heading, font=font(24, True), fill=TEXT)
        d.text((412, y + 32), body, font=font(19), fill=MUTED)
        if y < 645:
            d.line((368, y + 38, 368, y + 94), fill="#A7DDD4", width=3)
        y += 105
    d.rounded_rectangle((1030, 740, 1350, 795), radius=15, fill=TEAL)
    d.text((1080, 754), "View full claim trace", font=font(20, True), fill=WHITE)
    im.save(ROOT / "12-resolution.png")


def make_trace():
    im = app_shell("Operations", "Every meaningful event in one claim timeline.")
    d = ImageDraw.Draw(im)
    card(d, (300, 220, 1010, 835))
    d.text((340, 252), "Claim trace", font=font(31, True), fill=INK)
    d.text((340, 294), "CLM-W2-006 · Approved", font=font(20), fill=MUTED)
    events = [
        ("Claim received", "Email source recorded", TEAL),
        ("Facts extracted", "Structured claim prepared", TEAL),
        ("Validation completed", "FIR and report requested", AMBER),
        ("Policy guidance retrieved", "2 relevant passages", TEAL),
        ("Guarded agent action", "Information request prepared", TEAL),
        ("Additional information received", "FIR matched to source", TEAL),
        ("Human decision", "Edited and approved", TEAL),
    ]
    y = 350
    for heading, body, color in events:
        d.ellipse((350, y + 4, 372, y + 26), fill=color)
        if y < 735:
            d.line((361, y + 27, 361, y + 76), fill="#BBDCD5", width=3)
        d.text((397, y), heading, font=font(22, True), fill=TEXT)
        d.text((397, y + 29), body, font=font(17), fill=MUTED)
        y += 70
    card(d, (1040, 220, 1395, 835), fill=TEAL_DARK, outline=TEAL_DARK)
    d.text((1080, 260), "Pipeline summary", font=font(27, True), fill=WHITE)
    metrics = [("1", "claim source"), ("2", "memories retrieved"), ("1", "guarded action"), ("100%", "trace complete")]
    y = 340
    for value, label in metrics:
        d.text((1080, y), value, font=font(42, True), fill="#9DE2D5")
        d.text((1080, y + 48), label, font=font(18), fill="#D8ECE8")
        y += 118
    pill(d, (1080, 750), "Human approved", fill=WHITE, color=TEAL_DARK)
    im.save(ROOT / "13-trace.png")


def make_evals():
    im = app_shell("Operations", "Evaluation reports for grounding, safety and workflow quality.")
    d = ImageDraw.Draw(im)
    tiles = [
        ("Policy grounding", "96%", "Answers supported by policy evidence"),
        ("Guardrail compliance", "100%", "Agent actions held for human approval"),
        ("Memory usefulness", "89%", "Reviewer-rated relevant guidance"),
        ("Trace completeness", "100%", "Required workflow events recorded"),
    ]
    x_positions = [300, 575, 850, 1125]
    for x, (label, value, detail) in zip(x_positions, tiles):
        card(d, (x, 230, x + 245, 430))
        d.text((x + 22, 258), label, font=font(20, True), fill=TEXT)
        d.text((x + 22, 307), value, font=font(48, True), fill=TEAL_DARK)
        d.multiline_text((x + 22, 366), detail, font=font(15), fill=MUTED, spacing=4)
    card(d, (300, 465, 1395, 835))
    d.text((340, 500), "Latest evaluation report", font=font(29, True), fill=INK)
    pill(d, (1180, 495), "Passed")
    rows = [
        ("Extraction completeness", "24 / 25", "1 low-confidence field routed to review"),
        ("RAG citation support", "18 / 19", "Policy passages preserved with the answer"),
        ("Agent tool safety", "12 / 12", "No outbound action without approval"),
        ("Decision trace", "15 / 15", "End-to-end claim history available"),
    ]
    y = 565
    for label, score, note in rows:
        d.text((345, y), label, font=font(21, True), fill=TEXT)
        d.text((720, y), score, font=font(21, True), fill=TEAL_DARK)
        d.text((875, y), note, font=font(17), fill=MUTED)
        d.line((345, y + 48, 1350, y + 48), fill=LINE, width=2)
        y += 65
    im.save(ROOT / "14-evals.png")


def make_outro():
    im = Image.new("RGB", (1440, 900), TEAL_DARK)
    d = ImageDraw.Draw(im)
    d.ellipse((575, 190, 865, 480), fill="#A3E3D5")
    d.ellipse((640, 235, 860, 455), fill=TEAL_DARK)
    d.rectangle((715, 190, 865, 335), fill=TEAL_DARK)
    d.text((460, 540), "ClaimFlow AI", font=font(76, True), fill=WHITE)
    d.text((415, 650), "Move every claim forward with clarity.", font=font(34), fill="#CFE9E4")
    im.save(ROOT / "15-outro.png")


def add_handoff_overlay(path: Path):
    im = Image.open(path).convert("RGB")
    im = fit_crop(im, (1440, 900)).filter(ImageFilter.GaussianBlur(0.3))
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rounded_rectangle((760, 250, 1370, 735), radius=28, fill=(255, 255, 255, 245), outline=LINE, width=2)
    d.text((805, 292), "Submitted information", font=font(30, True), fill=INK)
    pill(d, (805, 345), "Matched to response")
    d.text((805, 430), "FIR number", font=font(20, True), fill=MUTED)
    d.rounded_rectangle((805, 468, 1325, 535), radius=14, fill=WARM, outline=LINE, width=2)
    d.text((830, 485), "FIR-2026-BLR-1842", font=font(27, True), fill=TEXT)
    d.text((805, 578), "Supporting evidence", font=font(20, True), fill=MUTED)
    d.text((805, 615), "Police report · claimant response", font=font(21), fill=TEXT)
    d.rounded_rectangle((805, 665, 1100, 715), radius=14, fill=TEAL)
    d.text((855, 677), "Add to claim", font=font(20, True), fill=WHITE)
    Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB").save(path)


def add_memory_overlay(path: Path):
    im = Image.open(path).convert("RGB")
    im = fit_crop(im, (1440, 900))
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rounded_rectangle((690, 420, 1365, 815), radius=28, fill=(255, 255, 255, 247), outline=LINE, width=2)
    d.text((735, 458), "Similar reviewed claim", font=font(29, True), fill=INK)
    d.text((735, 505), "Vehicle theft · missing FIR at intake", font=font(20), fill=MUTED)
    d.rounded_rectangle((735, 555, 1320, 650), radius=18, fill=MINT)
    d.text((760, 578), "Request the FIR and police report before review.", font=font(20, True), fill=TEAL_DARK)
    d.text((735, 690), "How useful was this guidance?", font=font(19, True), fill=TEXT)
    x = 735
    for label, selected in (("Strong", True), ("Relevant", False), ("Not relevant", False)):
        w = 120 if label != "Not relevant" else 165
        d.rounded_rectangle((x, 732, x + w, 782), radius=14, fill=TEAL if selected else WHITE, outline=TEAL if selected else LINE, width=2)
        d.text((x + 20, 744), label, font=font(18, True), fill=WHITE if selected else TEAL_DARK)
        x += w + 16
    Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB").save(path)


def branded_frame(scene: dict, index: int) -> Image.Image:
    src = Image.open(ROOT / scene["image"]).convert("RGB")
    screen = fit_crop(src, (1760, 735))
    canvas = Image.new("RGB", (W, H), WARM)
    d = ImageDraw.Draw(canvas)
    d.text((72, 35), "C", font=font(56, True), fill=TEAL_DARK)
    d.text((126, 52), "ClaimFlow AI", font=font(27, True), fill=INK)
    pill(d, (1660, 42), f"{index:02d} / 15", fill=MINT, color=TEAL_DARK)
    shadow = Image.new("RGBA", (1780, 755), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((10, 10, 1770, 745), radius=28, fill=(17, 75, 68, 35))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    canvas.paste(shadow, (70, 125), shadow)
    mask = rounded_mask(screen.size, 24)
    canvas.paste(screen, (80, 125), mask)
    d.rounded_rectangle((80, 125, 1840, 860), radius=24, outline=LINE, width=2)
    d.text((82, 900), scene["title"], font=font(42, True), fill=INK)
    d.text((84, 962), scene["subtitle"], font=font(25), fill=MUTED)
    return canvas


def main():
    add_handoff_overlay(ROOT / "10-review-handoff.png")
    add_memory_overlay(ROOT / "11-memory-feedback.png")
    make_resolution()
    make_trace()
    make_evals()
    make_outro()
    scenes = json.loads((ROOT / "storyboard.json").read_text())
    frames_dir = ROOT / "frames"
    frames_dir.mkdir(exist_ok=True)
    for i, scene in enumerate(scenes, 1):
        branded_frame(scene, i).save(frames_dir / f"scene-{i:02d}.png", quality=95)
    print(f"Prepared {len(scenes)} branded 1920x1080 frames in {frames_dir}")


if __name__ == "__main__":
    main()
