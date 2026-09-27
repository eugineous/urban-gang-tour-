import { BookForm } from './BookForm';

export function BookPage() {
  return <main className="ugt-book-page" data-ugt-motion="quiet"><section className="ugt-book-page__hero"><div className="ugt-page-frame"><p className="ugt-kicker ugt-kicker--yellow">Institutional booking</p><h1>Tell us<br />where.</h1><p>Bring Urban Gang Tour to a school or institution with one clear request. We will review it before confirming anything.</p></div></section><section className="ugt-book-page__body"><div className="ugt-page-frame ugt-book-page__grid"><aside><p className="ugt-kicker">What happens next</p><ol><li><b>01</b><span>You send the institutional request.</span></li><li><b>02</b><span>The team reviews the details.</span></li><li><b>03</b><span>Any confirmation comes directly in writing.</span></li></ol></aside><BookForm /></div></section></main>;
}
