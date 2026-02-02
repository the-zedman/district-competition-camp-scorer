# Blue Mountains District Scouts – Competition Camp Scorer

A scoring tool for the **Blue Mountains District Scouts** annual competition camp. The camp tests Scouts’ ability to work in their Patrols, undertake Scouting challenges, and set up and maintain a traditional Scout camp for three days in all weather conditions.

The competition has been running for nearly 100 years.

## Awards

1. **Camp Competition Award**  
   Winners receive the **Blue Mountains District Memorial Camping Shield**.

2. **Activity Bases Competition**  
   Winners receive the **Judy "SCSI" Barr Memorial Shield**.

3. **Combined Highest Scores**  
   Winners receive the **Blue Mountains District Competition Camp Flag**.

## Repo & deployment

- **GitHub:** [github.com/the-zedman/district-competition-camp-scorer](https://github.com/the-zedman/district-competition-camp-scorer)
- **Production:** Every push to `main` is built and deployed automatically via GitHub Actions (see `.github/workflows/deploy.yml`).

**One-time setup:** In the repo on GitHub go to **Settings → Pages** and set **Source** to **GitHub Actions**. Then each push to `main` will deploy to `https://<your-username>.github.io/district-competition-camp-scorer/`.

## Local development

Open `index.html` in a browser, or use a local static server:

```bash
npx serve .
```

## License

For use by Blue Mountains District Scouts.
