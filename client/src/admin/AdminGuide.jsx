import { Link } from 'react-router-dom';
import { Panel } from './adminUi';

const sections = [
  {
    title: 'Recommended order',
    body: (
      <ol className="list-decimal pl-5 space-y-2 text-slate-600 dark:text-slate-400">
        <li>
          <strong className="text-slate-800 dark:text-slate-200">Media uploads</strong> — upload video files, poster images,
          and subtitle files. Note the file names shown after upload; you will paste them into series / episode forms.
        </li>
        <li>
          <strong className="text-slate-800 dark:text-slate-200">New series</strong> — step 1: title and type. Use{' '}
          <em>Save as draft</em> to store work-in-progress, or <em>Next</em> to fill step 2. You can only{' '}
          <em>Publish</em> after step 2 has a description (20+ characters), at least one genre, a poster file name from
          Media, and a release year. <em>Publish to catalog</em> makes the title visible on Browse and Search.
        </li>
        <li>
          <strong className="text-slate-800 dark:text-slate-200">New season</strong> — pick the series and season number.
          Season numbers must be unique per series.
        </li>
        <li>
          <strong className="text-slate-800 dark:text-slate-200">New episode</strong> — choose season, episode number,
          title, then attach at least one quality (video file name from Media). Optional: thumbnail and subtitles.
        </li>
      </ol>
    ),
  },
  {
    title: 'Drafts',
    body: (
      <p className="text-slate-600 dark:text-slate-400">
        Drafts are hidden from the public site until you publish. Open <Link to="/admin/series/drafts" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">Drafts</Link> to continue editing or delete.
        Publishing from the drafts list still requires the same details as step 2 — if the server rejects publish, use{' '}
        <strong>Edit (details)</strong> to finish the form. Streaming and posters for draft content are only available to
        admins while testing.
      </p>
    ),
  },
  {
    title: 'Publishing rules',
    body: (
      <p className="text-slate-600 dark:text-slate-400">
        A series cannot go live without: <strong>description</strong> (min. 20 characters), <strong>at least one genre</strong>,{' '}
        <strong>poster file name</strong> (upload the image in Media first), and <strong>release year</strong> (1900–2100).
      </p>
    ),
  },
  {
    title: 'Movies vs series',
    body: (
      <p className="text-slate-600 dark:text-slate-400">
        Choose <strong>Movie</strong> for a single feature; you still add one “season” (e.g. season 1) and one or more
        episodes if you split qualities or extras. <strong>Series</strong> is the default for multi-season shows.
      </p>
    ),
  },
  {
    title: 'Troubleshooting',
    body: (
      <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-400">
        <li>
          <strong className="text-slate-800 dark:text-slate-200">Video won’t play</strong> — confirm the file name in the
          episode matches Media uploads exactly (including extension). Check that the series is published if testing as a
          non-admin user.
        </li>
        <li>
          <strong className="text-slate-800 dark:text-slate-200">Poster missing</strong> — upload the image in Media, copy
          the stored file name into the series form on step 2.
        </li>
        <li>
          <strong className="text-slate-800 dark:text-slate-200">Season already exists</strong> — use a different season
          number or edit the existing season in the database.
        </li>
      </ul>
    ),
  },
];

export default function AdminGuide() {
  return (
    <div className="space-y-8 max-w-3xl">
      <Panel title="Admin guide" subtitle="How to build your catalog from uploads to published episodes">
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          This panel is a quick reference. Your workflow: <strong>upload files → create series → add season(s) → add
          episodes</strong> linking to those files.
        </p>
        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white mb-3">{s.title}</h3>
              <div className="text-sm leading-relaxed">{s.body}</div>
            </section>
          ))}
        </div>
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/admin/media"
          className="inline-flex px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold"
        >
          Open Media uploads
        </Link>
        <Link
          to="/admin/series/new"
          className="inline-flex px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 dark:border-white/15 dark:text-slate-300"
        >
          New series
        </Link>
        <Link
          to="/admin/seasons"
          className="inline-flex px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 dark:border-white/15 dark:text-slate-300"
        >
          New season
        </Link>
        <Link
          to="/admin/episodes"
          className="inline-flex px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 dark:border-white/15 dark:text-slate-300"
        >
          New episode
        </Link>
      </div>
    </div>
  );
}
