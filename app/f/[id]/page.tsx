import { notFound } from 'next/navigation';
import { sql, ensureSchema } from '@/lib/db';
import EnquiryForm from '@/components/EnquiryForm';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return { title: 'Enquiry' };
  await ensureSchema();
  const [c] = await sql`select name from companies where id = ${id}`;
  return { title: c ? `Contact ${c.name}` : 'Enquiry', robots: { index: false } };
}

/** Public enquiry form a founder shares on their website, Instagram bio or a QR code. */
export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await ensureSchema();
  const [c] = await sql`select name from companies where id = ${id}`;
  if (!c) notFound();
  return (
    <main className="enq">
      <EnquiryForm id={id} company={c.name || 'us'} />
    </main>
  );
}
