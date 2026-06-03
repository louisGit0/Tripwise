---
phase: 09-ios-app-store-release
type: assets
requirements: [REL-01]
created: 2026-06-03
---

# ASSETS — Icon verification + Screenshot brief

> Submission assets only. NOT bundled into the app — these are inputs you (the user)
> upload to App Store Connect during wave 09-07.

---

## 1. App Store icon — verification

The App Store marketing icon is derived from `mobile/assets/images/icon.png`. Apple
**rejects** icons that are not exactly 1024×1024 RGB **without alpha**. Verify before
every submission.

### Check command

```bash
file mobile/assets/images/icon.png
```

**Expected output (PASS):**

```
mobile/assets/images/icon.png: PNG image data, 1024 x 1024, 8-bit/color RGB, non-interlaced
```

**FAIL signals:**

- `1024 x 1024, 8-bit/color RGBA` → has alpha channel. Reject by App Store.
- Any dimension other than `1024 x 1024` → wrong size. Reject by App Store.
- `8-bit colormap` → indexed PNG (PNG-8). Reject.

### If the icon has alpha (flatten on opaque background)

Use ImageMagick (most reliable):

```bash
magick mobile/assets/images/icon.png \
  -background white -alpha remove -alpha off \
  -strip \
  mobile/assets/images/icon.png
```

Then re-run `file …` and confirm the output now reads `RGB` (not `RGBA`).

### If the icon is the wrong size

Re-export the source artwork at exactly 1024×1024 from the original design file
(Figma / Sketch / Affinity). Do not upscale a smaller PNG — Apple's automated
checks detect resampling artifacts.

---

## 2. Screenshot brief

### Required sets

Per Apple's 2026 phone-only requirements (we set `ios.supportsTablet: false` in 09-02,
so no iPad screenshots are required):

| Set | Reference device | Pixel dimensions | Required? |
|-----|------------------|------------------|-----------|
| 6.7" iPhone (primary) | iPhone 15/16 Pro Max | **1290 × 2796** portrait | YES — App Store auto-scales down |
| 6.5" iPhone (secondary) | iPhone 11 Pro Max | **1242 × 2688** portrait | YES — required when no 6.9" set is supplied |

You need **5 screenshots per set × 2 sets = 10 PNG files**. All copy in **French**.

### The 5 shots (FR, seeded data — no Lorem)

#### Shot 1 — Dashboard avec calcul Paris → Lyon en cours

- **Screen:** `(tabs)/dashboard.tsx` (mobile) or `/app/dashboard` (web parity).
- **State:** Origin field shows `Paris`, destination field shows `Lyon`; the
  segmented control is on **Adresses** (not Distance); a vehicle is selected
  (e.g. **Tesla Model 3 — Mon Tesla**); spinner or "Calcul en cours…" visible.
- **Must show:** the verygoodtrip wordmark in the top bar, the FR origin/destination
  inputs, the selected vehicle chip, the calculate CTA.
- **Avoid:** debug overlays, draft watermarks, real user names, real registration plates.

#### Shot 2 — Résultat trajet (coût total + DataBar énergie/péage + AnimatedCounter)

- **Screen:** `/app/trips/result` after a successful calc.
- **State:** Hero cost `42,62 €` (or similar Paris→Lyon figure), DataBar showing
  the **énergie vs péage** split, AnimatedCounter on the total, the multi-energy
  comparison bars below (gas / diesel / EV sorted by cost).
- **Must show:** distance `465 km`, durée `~4h 20`, the passengers stepper at `1`.
- **Avoid:** sessionStorage debug artifacts, any "fallback" disclaimer banner that
  would suggest the API failed during capture.

#### Shot 3 — Garage avec photo véhicule

- **Screen:** `(tabs)/vehicles.tsx` list view.
- **State:** 2 vehicles visible — one **Tesla Model 3** (EV, marked "Par défaut"
  with a star), one **Peugeot 208** (essence). Both rows show the **CarImages**
  vehicle photo, the brand avatar fallback, and stats (`X trajets · Y km`).
- **Must show:** the default-vehicle pill, the FuelBadge color treatment, a real
  photo (not the silhouette fallback).
- **Avoid:** zero-state ("Aucun véhicule") — the garage must look populated.

#### Shot 4 — Showroom catalogue avec recherche + photos

- **Screen:** `(tabs)/vehicles.tsx` → "Ajouter au garage" → catalog search step.
- **State:** Search query `Renault` or `Tesla` typed in the input, results list
  showing 4–6 catalog entries with brand + model + year + fuel type + photo.
- **Must show:** the search input, at least 4 photo-bearing results, the FuelBadge
  on each row.
- **Avoid:** an empty search state, "Aucun résultat" — search must return data.

#### Shot 5 — Paramètres

- **Screen:** `(tabs)/settings.tsx`.
- **State:** Theme set to **Système**, language **Français**, account section
  showing the demo reviewer email (or a generic display name), the danger-zone
  "Supprimer mon compte" button visible at the bottom.
- **Must show:** the 3 sections (Apparence / Langue / Compte), the version
  footer `v1.0`.
- **Avoid:** real user PII, a logged-out state.

---

## 3. Capture method

### Preferred — TestFlight build on a physical iPhone

Run after the production build is uploaded (RUNBOOK step 6) and TestFlight has
processed it:

1. Install via TestFlight on an iPhone 15 Pro Max (for the 6.7" set) and an
   iPhone 11 Pro Max (for the 6.5" set), OR use one device and Apple's automatic
   downscale (Apple Store Connect accepts the 6.7" set for both slots if no 6.5"
   is uploaded — but supplying both is the safest path).
2. Seed the demo reviewer account (METADATA section B) and let the onboarding
   tour dismiss once.
3. Capture: **Power + Volume Up** on Face ID devices.
4. AirDrop or USB-pull the PNGs to your Mac.

### Acceptable fallback — iOS Simulator at exact device size

If you don't have access to both physical devices:

```bash
# In Xcode → Window → Devices and Simulators → simulator with the exact model.
# Open Simulator app, hit ⌘+S to save a screenshot at the simulator's native size.
```

Use `iPhone 15 Pro Max` and `iPhone 11 Pro Max` simulator targets — they produce
PNGs at exactly 1290×2796 and 1242×2688 respectively. **Do not** rescale in
Photoshop afterward — Apple's automated checks reject resampled screenshots.

---

## 4. Export

- **Format:** PNG, RGB, no alpha (same constraint as the icon).
- **Dimensions:** exactly 1290×2796 (6.7") or 1242×2688 (6.5") — no other size
  is accepted in those slots.
- **Filename convention:** `01-dashboard-67.png`, `02-resultat-67.png`,
  `03-garage-67.png`, `04-showroom-67.png`, `05-parametres-67.png`, then the
  `-65.png` variants.
- **Save to:** `.planning/phases/09-ios-app-store-release/assets/screenshots/`
  (create the directory if it doesn't exist; it is for your local reference and
  not committed unless you want a backup).

### Strip alpha + verify dimensions in one shot

```bash
# Run for each captured PNG before upload
magick "01-dashboard-67.png" \
  -background white -alpha remove -alpha off \
  -strip \
  "01-dashboard-67.png"

file "01-dashboard-67.png"   # must read: PNG image data, 1290 x 2796, 8-bit/color RGB
```

---

## What you do NOT need for v1.0

- **App Preview video** (the 15–30s in-app capture) — skipped in D-44. Can be
  added in a later submission without a new build.
- **iPad screenshots** — `ios.supportsTablet: false` removes the requirement.
- **Apple Watch / Mac / Vision Pro screenshots** — none of those targets are
  declared.
