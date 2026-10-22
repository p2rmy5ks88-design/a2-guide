"""Wraps game.html (the page body) into a standalone index.html for any web host."""
import pathlib
here=pathlib.Path(__file__).parent
body=(here/'game.html').read_text()
head='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover"><link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icon-180.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Skyline Estates"><meta name="theme-color" content="#10223f"><script src="../eko-estates/firebase-config.js"></script><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
(here/'index.html').write_text(head+body+'</body></html>')
print('wrote index.html')
