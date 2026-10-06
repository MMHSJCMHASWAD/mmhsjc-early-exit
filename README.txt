# MMHSJC Early Exit PWA

## What is included
- `index.html` — mobile app
- `manifest.json` — PWA installation information
- `service-worker.js` — offline shell/cache
- `Code.gs` — Google Apps Script backend
- `icon-*.png` — MMHSJC app icons

## Google Sheet
The bound Google Sheet should contain:
- `STUDENT MASTER`
- `EARLY EXIT`
- `LISTS`

The backend reads student information dynamically from the header names, so small header variations are supported.

## Deploy the backend
1. Open the Google Sheet.
2. Extensions → Apps Script.
3. Paste `Code.gs`.
4. In Project Settings → Script Properties, create:
   `EARLY_EXIT_PIN` = your chosen staff PIN.
5. Deploy → New deployment → Web app.
6. Execute as: Me.
7. Access: preferably your school Google domain. If the PWA is hosted separately and needs public access, use the appropriate access setting for your school's security policy.
8. Copy the `/exec` URL.

## Configure the PWA
The PWA is already connected to the deployed backend URL:
https://script.google.com/macros/s/AKfycbySxQaiEbHCSK3Ocdxku2K2-NzdB85O5bNtKlVtrMl4O7cow1UI4A7hx4I2tX0SAKS6/exec

Open `index.html` only if you need to change the backend URL.

`PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE`
with the `/exec` URL.

## Host the PWA
Host these files on an HTTPS static host such as GitHub Pages, Cloudflare Pages, Netlify, or your own HTTPS server.

The app must be HTTPS for installation/service-worker support.

## Install on Android
1. Open the PWA URL in Chrome.
2. Tap the browser menu.
3. Choose "Add to Home screen" / "Install app".
4. The MMHSJC Early Exit icon will appear on the phone.

## WhatsApp
After a successful save, the app opens WhatsApp using the parent's registered mobile number and prepares the complete early-exit message. Staff tap Send.

## Security note
This app handles student and parent information. Use school-managed accounts/access where possible and do not publish the PWA URL publicly unless your access controls are appropriate.

## Important: hosting the PWA
A PWA must be hosted from HTTPS. Do not open index.html directly from the phone. Upload this folder to a static HTTPS host such as GitHub Pages, Cloudflare Pages, or Netlify. Then open the hosted URL in Chrome on the Android phone and choose Add to Home screen / Install app.
