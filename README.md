# PassPilot

A small password checker and generator made with HTML, CSS, and JavaScript.

The design is intentionally simple: a single page, clear text, and no extra frameworks.

## Features

- See an approximate password strength rating and tips as you type.
- Show or hide your input.
- Generate a random password with a chosen length and character types.
- Copy a generated password to your clipboard.
- Use it offline; the app does not send passwords to a server or save them.

## Getting started

Open `index.html` in your browser. That's it.

To edit the project, open the folder in VS Code.

## Files

- `index.html` — page structure
- `styles.css` — layout and visual design
- `script.js` — password checks and generator

## GitHub Pages

Publish the files in the repository root. Go to **Settings → Pages**, select **Deploy from a branch**, choose `main` and `/(root)`, then save.

## A note about security

The strength checker is a learning tool, not a professional password audit. It cannot tell whether a password has been leaked or how quickly a real attacker might guess it. For testing, use made-up examples rather than passwords you actually use.

The generator uses `crypto.getRandomValues` and unbiased random selection. Passwords are made in your browser; the site has no backend.

