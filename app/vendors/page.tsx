import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {metadataForPathDynamic} from '@/app/_lib/seo';
import {structuredDataForPath} from '@/app/_lib/jsonld';
import {JsonLd} from '@/app/_components/JsonLd';
import DocumentLink from '@/ui/components/DocumentLink';
import {MessageText} from '@/ui/i18n/MessageText';
import {vendorMessages, type VendorMessageKey} from '@/lib/vendor/messages';
import {SITE} from '@/lib/site';
import styles from './vendors.module.css';

const PATH = '/vendors';
export const revalidate = 300;
export async function generateMetadata():Promise<Metadata> { return metadataForPathDynamic(PATH); }
function T({id}:{id:VendorMessageKey}) { return <MessageText catalogue={vendorMessages} message={id}/>; }

export default function VendorsPage() {
  return <>
    <JsonLd data={structuredDataForPath(PATH)}/>
    <div className={styles.page}>
      <section className={`wrap ${styles.hero}`} aria-labelledby="vendor-title">
        <div>
          <p className={`eyebrow ${styles.eyebrow}`}><T id="eyebrow"/></p>
          <h1 id="vendor-title"><T id="title"/></h1>
          <p className={styles.intro}><T id="intro"/></p>
          <DocumentLink className="button" href="/downloads/vendor-application.pdf" download><T id="download"/><span aria-hidden="true">↓</span></DocumentLink>
          <p className={styles.documentNote}><T id="pdfNote"/></p>
        </div>
        <div className={styles.preview} aria-hidden="true">
          <div className={styles.sheet}>
            <div className={styles.sheetTop}><Image src="/design-assets/logo.png" width={100} height={60} alt="" unoptimized/><span>01 / 02</span></div>
            <p className={styles.sheetTitle}><T id="eyebrow"/></p>
            <div className={styles.previewLines}><i/><i/></div>
            <p><b>01</b> <T id="previewOffer"/></p>
            <div className={styles.previewBox}/>
            <p><b>02</b> <T id="previewSafety"/></p>
            <div className={styles.previewLines}><i/><i/><i/></div>
          </div>
        </div>
      </section>

      <section className={`wrap ${styles.fees}`} aria-labelledby="vendor-fees">
        <h2 id="vendor-fees"><T id="feesTitle"/></h2>
        <dl className={styles.feeGrid}>
          <div><dt lang="en">Package 1 — Main Vendor</dt><dd><span>KES</span> 30,000–45,000</dd></div>
          <div><dt lang="en">Package 2 — Minor Vendor</dt><dd><span>KES</span> 10,000–15,000</dd></div>
        </dl>
        <p className={styles.feeNote}><T id="rangeNote"/></p>
      </section>

      <section className={`wrap ${styles.application}`} aria-labelledby="vendor-preparation">
        <div>
          <h2 id="vendor-preparation"><T id="prepareTitle"/></h2>
          <ul className={styles.preparation}>{(['prepareOffer','prepareUtilities','prepareSafety'] as const).map(id => <li key={id}><T id={id}/></li>)}</ul>
        </div>
        <div className={styles.steps}>
          <h2><T id="applyTitle"/></h2>
          <ol>
            <li><DocumentLink className="text-link" href="/downloads/vendor-application.pdf" download><T id="stepOne"/></DocumentLink></li>
            <li><T id="stepTwo"/></li>
            <li><T id="stepThree"/> <a href={`mailto:${SITE.email}?subject=Vendor%20application`} className={styles.email}>{SITE.email}</a>.</li>
          </ol>
          <p className={styles.acceptance}><T id="acceptance"/></p>
        </div>
      </section>

      <section className={`wrap ${styles.privacy}`}>
        <p><T id="privacy"/></p>
        <Link className="text-link" href="/privacy-policy"><T id="privacyLink"/> <span aria-hidden="true">↗</span></Link>
      </section>

      <section className={`wrap ${styles.sponsors}`} aria-labelledby="sponsor-title">
        <div className={styles.sponsorIntro}>
          <p className="eyebrow"><T id="sponsorEyebrow"/></p>
          <h2 id="sponsor-title"><T id="sponsorTitle"/></h2>
          <p><T id="sponsorIntro"/></p>
        </div>
        <div>
          <ul className={styles.opportunities}>{(['principal','activation','community','media'] as const).map((id,i) => <li key={id}><span aria-hidden="true">0{i+1}</span><T id={id}/></li>)}</ul>
          <p className={styles.sponsorTerms}><T id="quoteOnly"/></p>
        </div>
        <div className={styles.sponsorActions}>
          <DocumentLink className="button light" href="/downloads/sponsorship-partnership-pack.pdf" download><T id="downloadSponsor"/><span aria-hidden="true">↓</span></DocumentLink>
          <p className={styles.documentNote}><T id="pdfNote"/></p>
          <div><Link className="text-link" href="/book?type=sponsorship"><T id="enquireSponsor"/> <span aria-hidden="true">↗</span></Link><Link className="text-link" href="/book?type=partnership"><T id="enquirePartnership"/> <span aria-hidden="true">↗</span></Link></div>
        </div>
      </section>
    </div>
  </>;
}
