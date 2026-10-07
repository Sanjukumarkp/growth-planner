export const metadata = { title: 'Privacy policy · Growth Planner' };
export default function Page() {
  return (
    <main className="page legal">
      <p className="draft">Draft for legal review. Have a lawyer check this against India’s Digital Personal Data Protection Act, 2023 and Rules, 2025 before launch.</p>
      <h1>Privacy policy</h1>
      <h2>What we collect</h2>
      <p>Your name, email and password (stored only as a one-way hash). The plan you enter: company profile, sales, spending, bank balance, invoices, bills, tasks, team member names and advisor conversations. Basic security logs such as sign-in attempts.</p>
      <h2>Why</h2>
      <p>Only to run the planner for you and your team: forecasts, weekly moves, reminders and advisor answers. We do not sell your data or use it for advertising.</p>
      <h2>Who we share it with</h2>
      <ul>
        <li>Our hosting and database providers, to store it.</li>
        <li>Anthropic, only the summary sent with each advisor question, to generate the answer.</li>
        <li>Our email provider, to send password resets, invites and reminders.</li>
      </ul>
      <p>Bank statements you import are read in your browser. Only the monthly totals you confirm are saved.</p>
      <h2>Your rights</h2>
      <p>You can see and correct your data in the app, download all of it from Account and team, and delete your account at any time. To withdraw consent, delete your account or write to the grievance contact below.</p>
      <h2>How long we keep it</h2>
      <p>Until you delete your account. Security logs are kept for up to 12 months.</p>
      <h2>Grievance contact</h2>
      <p>Name, email and postal address of your grievance officer go here.</p>
    </main>
  );
}
