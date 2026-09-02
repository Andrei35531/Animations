# Payment success animation assets

| File | Source | Role |
|------|--------|------|
| `jar-base.png` | `public/раскадровка` frame `(1)` | Glass jar |
| `jar-glass-front.png` | highlights from `(1)` | Front specular overlay |
| `jar-inner-mask.png` | derived from `(1)` | Interior clip mask |
| `coins/coin-1…10.png` | `public/раскадровка/монеты` | Ruble coin angles |

Re-run extraction:

```bash
node scripts/extract-raskadrovka-assets.mjs   # jar layers
node scripts/extract-coin-storyboard.mjs      # coins
```
