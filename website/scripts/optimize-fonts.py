"""Generate web derivatives; never modifies the supplied font originals."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset

root = Path(__file__).resolve().parents[1] / 'public' / 'fonts'
for source, target in [('druk-super.otf', 'druk-super.woff2'),
                       ('druk-wide-bold.otf', 'druk-wide-bold.woff2'),
                       ('eurostile-extended.ttf', 'eurostile-extended.woff2'),
                       ('inter-variable.ttf', 'inter-latin.woff2')]:
    font = TTFont(root / source)
    original_ascii = set(font.getBestCmap()).intersection(range(32, 127))
    if source.startswith('inter-'):
        options = subset.Options()
        options.layout_features = ['*']
        converter = subset.Subsetter(options=options)
        converter.populate(unicodes=list(range(0x250)) + list(range(0x2000, 0x2070)) + [0x20AC, 0x2122])
        converter.subset(font)
    font.flavor = 'woff2'
    font.save(root / target)
    converted = TTFont(root / target)
    assert original_ascii.issubset(converted.getBestCmap()), target
    assert (root / target).stat().st_size < (root / source).stat().st_size, target
    print(f'{target}: {(root / target).stat().st_size:,} bytes')
