# Third-party notices

The MIT License covers project-authored application code and documentation. It does not grant rights to third-party names, trademarks, artwork, or logos.

The demo cover sheet, approved design mockup, and app icon are generated illustrative assets. They are not exports or screenshots of a user's library. Generation prompts are included in `public/demo-cover-sheet.prompt.txt` and `public/app-icon.prompt.txt`. The app icon depicts an original archive of game cartridges; it does not represent a storefront or console brand. Browser and Apple touch icons are size derivatives of `public/app-icon.png`.

Files under `public/logos/` identify interoperating services:

- Amazon logo — Amazon.com, Inc. or its affiliates
- EA logo — Electronic Arts Inc.
- Epic Games logo — Epic Games, Inc.
- GOG logo — GOG sp. z o.o.
- Steam logo — Valve Corporation
- Ubisoft logo — Ubisoft Entertainment SA

These marks remain property of their respective holders. Their inclusion does not imply affiliation or endorsement. Redistributors are responsible for reviewing applicable brand and trademark requirements and may replace or remove these assets without affecting core application behavior.

Runtime game cover images are requested from provider CDNs. Documentation screenshots in `docs/screenshots/` also depict game artwork and provider marks as part of the application's interface. That third-party artwork and branding remain the property of their respective holders and are not licensed under the project's MIT License. No standalone provider cover-art collection is bundled with the application.

The self-hosted Archivo and Manrope fonts are installed through their Fontsource packages and licensed under the SIL Open Font License 1.1. Their original copyright notices and license texts are included with the static assets:

- [Archivo license](public/licenses/Archivo-OFL.txt)
- [Manrope license](public/licenses/Manrope-OFL.txt)

JavaScript dependencies retain their own licenses. `pnpm build` copies license, notice, copyright, and copying files from the installed dependencies into `.next/standalone/licenses/dependencies/`, preserving package paths. This includes notices for bundled Next.js dependencies and installed development tools, so the collection may exceed the runtime dependency set. The standalone output and Docker image also include this file and the project `LICENSE`. Redistributors should retain these notices when repackaging the application.
