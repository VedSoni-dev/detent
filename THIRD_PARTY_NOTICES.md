# Third-party notices

- **qrcode-generator** (npm, by Kazuhiko Arase, MIT): draws the QR code in the app and on the landing page. Its licence ships in `node_modules/qrcode-generator/LICENSE`.

The haptic trigger in `lib/detent.js` is our own code, written from the publicly documented technique (`navigator.vibrate` on Android; a `<label>` for an iOS 17.4+ `<input type="checkbox" switch>` on iPhone). The technique is also used by the MIT-licensed [web-haptics](https://github.com/lochie/web-haptics) (Lochie Axon) and [ios-haptics](https://github.com/tijnjh/ios-haptics); no code from either is included.
