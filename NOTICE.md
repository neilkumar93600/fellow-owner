# Third-party notices

Fellow Owners ships third-party work. This file carries the attribution those licences require, and
the Terms of service (§12) points here. Keep it accurate: adding a font, an icon set or an image is
the moment to add a line.

## Fonts

**Inter** — Copyright 2016 The Inter Project Authors (<https://github.com/rsms/inter>), Rasmus
Andersson. Licensed under the **SIL Open Font License, Version 1.1**:
<https://openfontlicense.org/open-font-license-official-text/>

Loaded with `next/font/google`, which downloads the font at build time and serves it from our own
origin. The files are unmodified and are not sold on their own, which is what the OFL asks. The
reserved font name is not used for any modified version, because there is no modified version.

**Instrument Serif** — Copyright 2022 The Instrument Serif Project Authors
(<https://github.com/Instrument/Instrument-Serif>), Instrument. Licensed under the **SIL Open Font
License, Version 1.1**: <https://openfontlicense.org/open-font-license-official-text/>

Loaded with `next/font/google` in the same way as Inter, and used for display headlines only. The
files are unmodified and are not sold on their own.

## Icons

**Lucide** (`lucide-react`) — Copyright 2022 Lucide Contributors. **ISC licence**:
<https://github.com/lucide-icons/lucide/blob/main/LICENSE>

Lucide is itself a fork of Feather Icons, Copyright 2013–2022 Cole Bemis, MIT licence.

## Images

| File | What it is | Licence |
|------|------------|---------|
| `web/public/creator/*` | Photographs of the fictional demo creator Mira Lane, her travel scenes, community covers, fan avatars, the sign-in art and the muted `one-week.mp4` clip | Generated for this project with fal.ai: GPT Image 2.5 for the stills and Seedance 2.5 for the clip. Prompts and request ids are recorded in `prompt.md`. Every person shown is fictional and none is a user. |
| `web/public/demo/mira.jpg` | Earlier portrait of the demo creator "Mira" | **TODO(legal): record the stock licence here — provider, asset ID, licence type, date bought — or delete the file.** Superseded by `web/public/creator/mira-portrait.webp`. Until that line is real, do not ship this file. |
| `web/public/logo.svg`, `favicon.ico` | Our mark | Ours |

Every other picture in the product is drawn in CSS or SVG by us, or is a fan's own upload.

## Software

Runtime and build dependencies are listed with their versions in `pnpm-lock.yaml`, each under its own
licence (MIT, ISC, Apache-2.0 or BSD in every current case). To regenerate a full report:

```sh
pnpm licenses list --prod
```

No dependency in the tree carries a copyleft licence that would reach our own source. Check that
again before adding one.

## Our own work

Everything else — the product, its interface, the name "Fellow Owners" and its logo — belongs to the
operator named in `shared/src/operator.ts`, and is not open source.
