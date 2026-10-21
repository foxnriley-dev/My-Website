import { BRAND } from '@ife/domain';
import { BrandMark } from '@/components/brand';

export const metadata = { title: 'Privacy and data' };

export default function Privacy() {
  return (
    <>
      <header className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
        <BrandMark />
      </header>
      <main id="main" tabIndex={-1} className="outline-none mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <p className="mb-3 inline-flex rounded-full bg-warning-subtle px-3 py-1 text-sm font-semibold">
          Beta summary — not yet reviewed by counsel. The final privacy policy will replace this page.
        </p>
        <h1 className="text-3xl font-bold">Privacy and data</h1>
        <div className="mt-6 space-y-4 text-[17px] leading-relaxed">
          <p>Your machines, cases, photos and repair history are private to your account by default. They are not shared with other users.</p>
          <p>
            Photos are stored privately. Viewing a photo uses a link that expires after a few minutes. When we make the smaller copies used for
            previews and analysis, we remove embedded location and camera metadata from those copies. The original file you uploaded is kept
            privately with your case until you delete the photo, the case or your account.
          </p>
          <p>We do not use your photos or descriptions to train AI models by default.</p>
          <p>
            You can export your data and delete a case or your whole account at any time from Account. Deleting removes the records and stored
            photos from our live systems immediately. Copies inside the hosting provider&apos;s backups expire on that provider&apos;s backup
            schedule; the exact window will be stated here before public launch.
          </p>
          <p>We do not claim to automatically blur faces or license plates in photos. Please avoid including them when you can.</p>
          <p>Safety notices, incident reporting, data export and deletion are always free in {BRAND.productName}.</p>
        </div>
      </main>
    </>
  );
}
