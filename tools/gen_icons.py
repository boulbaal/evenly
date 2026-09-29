#!/usr/bin/env python3
"""Genereert de Evenly-iconen, favicon en het deelkaartje (OG-afbeelding).
Glyph: twee gestapelde munten met een gelijkteken, wit op blauw."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', 'public')
BLAUW = (31, 95, 160)        # #1F5FA0
LICHTBLAUW = (233, 241, 250)
WIT = (255, 255, 255)
TEKST = (31, 41, 51)
GEDEMPT = (107, 117, 128)


def font(size, bold=True):
    kandidaten = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    ]
    for p in kandidaten:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def glyph(img, cx, cy, s, kleur_body=WIT, kleur_accent=BLAUW):
    """Een ronde munt met een dik gelijkteken erin: 'evenly'."""
    d = ImageDraw.Draw(img)
    r = s // 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=kleur_body)
    # binnenring
    ring = max(2, s // 26)
    ri = r - int(s * 0.11)
    d.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], outline=kleur_accent, width=ring)
    # gelijkteken
    bw = int(s * 0.42)
    bh = max(4, int(s * 0.10))
    gap = int(s * 0.12)
    rr = bh // 2
    d.rounded_rectangle([cx - bw // 2, cy - gap - bh // 2, cx + bw // 2, cy - gap + bh // 2], radius=rr, fill=kleur_accent)
    d.rounded_rectangle([cx - bw // 2, cy + gap - bh // 2, cx + bw // 2, cy + gap + bh // 2], radius=rr, fill=kleur_accent)


def maak_icoon(maat, pad_frac=0.14, achtergrond=BLAUW, vierkant=False):
    img = Image.new('RGBA', (maat, maat), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = 0 if vierkant else int(maat * 0.22)
    d.rounded_rectangle([0, 0, maat, maat], radius=r, fill=achtergrond + (255,))
    glyph(img, maat // 2, maat // 2, int(maat * (1 - 2 * pad_frac)))
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    for maat in (192, 512):
        maak_icoon(maat, pad_frac=0.18).save(os.path.join(OUT, f'icon-{maat}.png'))
    for maat in (192, 512):
        maak_icoon(maat, pad_frac=0.24, vierkant=True).convert('RGB').save(os.path.join(OUT, f'icon-maskable-{maat}.png'))
    maak_icoon(180, pad_frac=0.18, vierkant=True).convert('RGB').save(os.path.join(OUT, 'apple-touch-icon.png'))
    maak_icoon(64, pad_frac=0.10).save(os.path.join(OUT, 'favicon.png'))

    og = Image.new('RGB', (1200, 630), WIT)
    d = ImageDraw.Draw(og)
    d.rectangle([0, 0, 380, 630], fill=LICHTBLAUW)
    ic = maak_icoon(220, pad_frac=0.18)
    og.paste(ic, (80, 205), ic)
    d.text((430, 210), 'Evenly', font=font(96, bold=True), fill=BLAUW)
    d.text((432, 330), 'Split costs with your group.', font=font(40, bold=False), fill=TEKST)
    d.text((432, 386), 'No account, no ads. Free.', font=font(40, bold=False), fill=GEDEMPT)
    d.text((432, 470), 'evenly.vanali.workers.dev', font=font(30, bold=True), fill=BLAUW)
    og.save(os.path.join(OUT, 'og.png'))
    print('iconen geschreven naar', os.path.abspath(OUT))


if __name__ == '__main__':
    main()
