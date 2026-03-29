# 📸 UTS Maracaibo - Instagram Feed

Feed automático de Instagram para la web del Tecnológico Antonio José De Sucre - Maracaibo.

## ¿Cómo funciona?

1. **GitHub Actions** ejecuta un script cada 3 horas
2. El script descarga los últimos posts de `@utsmaracaibo` desde Apify
3. Las imágenes se guardan en `images/` y los datos en `data/posts.json`
4. La web lee estos datos directamente desde este repositorio

## Configuración

### Secret requerido

En **Settings → Secrets and variables → Actions**, agregar:

| Secret | Valor |
|--------|-------|
| `APIFY_TOKEN` | Tu token de API de Apify |

## Estructura

```
├── .github/workflows/sync.yml  → Cron job (cada 3h)
├── scripts/sync-instagram.mjs  → Script de sincronización
├── data/posts.json              → Datos de los posts (auto-generado)
├── images/                      → Imágenes descargadas (auto-generado)
└── README.md
```

## URLs públicas

- **Posts JSON:** `https://raw.githubusercontent.com/ivanpdelg/uts-instagram-feed/main/data/posts.json`
- **Imágenes:** `https://raw.githubusercontent.com/ivanpdelg/uts-instagram-feed/main/images/{shortCode}.jpg`
