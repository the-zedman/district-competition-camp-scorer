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
- **Production:** Hosted on **Vercel** - every push to `main` automatically deploys to production.

**One-time setup:** Connect your GitHub repo to Vercel:
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import `the-zedman/district-competition-camp-scorer`
4. Vercel will auto-detect it as a static site (no build needed)
5. Click "Deploy"

After setup, every push to `main` will trigger an automatic deployment.

### Settings > Admins (CSV storage)

The **Settings → Admins** section reads and writes admins to a CSV stored in **Vercel Blob**. To enable it:

1. In your Vercel project, go to **Storage** and create a **Blob** store.
2. The project will get a `BLOB_READ_WRITE_TOKEN` environment variable automatically.
3. Redeploy so the API can read/write the `admins.csv` file.

The first admin is seeded as: **Chip**, **James Robinson**, **1st Blackheath**.

### Authentication

The app requires login for all users (admins and scorers). To enable authentication:

1. **Set JWT_SECRET**: In Vercel project settings → Environment Variables, add `JWT_SECRET` with a strong random string (e.g., generate with `openssl rand -hex 32`).
2. **Set passwords**: When adding admins or scorers, passwords are required. Passwords are hashed with bcrypt before storage.
3. **Login**: Users visit the site and are redirected to `login.html` if not authenticated. They select their user type (Admin or Scorer) and enter their Scout name and password.
4. **Session**: After login, users receive a JWT token stored in localStorage (valid for 7 days).

## Local development

Open `index.html` in a browser, or use a local static server:

```bash
npx serve .
```

## License

For use by Blue Mountains District Scouts.
