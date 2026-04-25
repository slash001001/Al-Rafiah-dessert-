# Deployment Guide — لعبة الرافعية

## Fast path: GitHub Actions Pages

```bash
git init
git add .
git commit -m "initial: Alrafyah 2D game MVP"
git branch -M main
git remote add origin git@github.com:<username>/<repo>.git
git push -u origin main
```

Then in GitHub:

```text
Settings → Pages → Source: GitHub Actions
```

The project already includes `.github/workflows/pages.yml`.

## Manual gh-pages branch deployment

```bash
npm run build
npm run deploy:gh-pages
```

Then in GitHub:

```text
Settings → Pages → Deploy from branch → gh-pages / root
```

## Verification checklist

```bash
npm run build
npm run preview
```

Open:

```text
http://localhost:4173
```

Confirm:

- Menu loads.
- Arabic/English toggle works.
- Start Run works.
- Car drives with keyboard and touch buttons.
- Rabdat traps appear after contact.
- Items can be collected.
- Upgrade menu stores progress.
- Win screen shows: زوروا الرافعية | Visit Alrafyah.
