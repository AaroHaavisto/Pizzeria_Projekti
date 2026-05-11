import {useEffect, useMemo, useState} from 'react';
import {Link, Navigate} from 'react-router-dom';
import Navigation from '../components/Navigation';
import {useCustomerSession} from '../contexts/CustomerSessionContext';
import {useLanguage} from '../contexts/LanguageContext';
import {createFeedback, fetchCustomerFeedback} from '../api/feedbackApi';

/**
 * Feedback page for logged-in customers.
 * Allows customers to submit feedback about the pizzeria.
 * @returns {React.ReactElement} Feedback page JSX
 */
function FeedbackPage() {
  const {customer} = useCustomerSession();
  const {language} = useLanguage();
  const isEnglish = language === 'en';
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState('5');
  const [savedMessage, setSavedMessage] = useState('');
  const [feedbackItems, setFeedbackItems] = useState([]);

  const labels = useMemo(
    () =>
      isEnglish
        ? {
            eyebrow: 'Feedback',
            title: 'Share feedback while you are logged in.',
            text: 'Send feedback about the menu, service, or the ordering flow.',
            rating: 'Rating',
            message: 'Message',
            submit: 'Send feedback',
            saved: 'Feedback saved.',
            history: 'Recent feedback',
            empty: 'No feedback sent yet.',
          }
        : {
            eyebrow: 'Palaute',
            title: 'Anna palautetta kirjautuneena.',
            text: 'Voit kommentoida palveluistamme.',
            rating: 'Arvio',
            message: 'Viesti',
            submit: 'Lähetä palaute',
            saved: 'Palaute tallennettu.',
            history: 'Viimeisimmät palautteet',
            empty: 'Palautetta ei ole vielä lähetetty.',
          },
    [isEnglish]
  );

  useEffect(() => {
  if (!customer?.id) {
    return;
  }

  let cancelled = false;

  async function loadFeedback() {
    try {
      const items = await fetchCustomerFeedback(customer.id);

      if (!cancelled) {
        setFeedbackItems(items);
      }
    } catch {
      if (!cancelled) {
        setFeedbackItems([]);
      }
    }
  }

  loadFeedback();

  return () => {
    cancelled = true;
  };
}, [customer?.id]);

  if (!customer) {
    return <Navigate to="/account?mode=login#kirjautuminen" replace />;
  }

 async function handleSubmit(event) {
  event.preventDefault();

    const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    setSavedMessage(
      isEnglish
        ? 'Write feedback before sending.'
        : 'Kirjoita palaute ennen lähettämistä.'
    );
    return;
  }

  try {
    const savedFeedback = await createFeedback({
      userId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      rating: Number(rating),
      message: message.trim(),
      message: trimmedMessage,
    });

setFeedbackItems(previousItems => [savedFeedback, ...previousItems].slice(0, 10));
    setMessage('');
    setRating('5');
    setSavedMessage(labels.saved);
  } catch {
    setSavedMessage(
      isEnglish
        ? 'Feedback could not be saved.'
        : 'Palautteen tallennus epäonnistui.'
    );
  }
}

  return (
    <div className="account-page">
      <header className="hero hero--account">
        <Navigation />

        <section className="hero__content account-hero" id="feedback">
          <p className="eyebrow">{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p className="hero__text">{labels.text}</p>
        </section>
      </header>

      <main className="account-layout">
        <section className="account-panel account-panel--form account-panel--full">
          <p className="section__label">{customer.name}</p>
          <form className="account-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>{labels.rating}</span>
              <select className="rating-select" value={rating} onChange={event => setRating(event.target.value)}>
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </label>

            <label className="field">
              <span>{labels.message}</span>
              <textarea
                rows="6"
                value={message}
                onChange={event => setMessage(event.target.value)}
                placeholder={isEnglish ? 'Write your feedback here.' : 'Kirjoita palaute tähän.'}
                required
              />
            </label>

            {savedMessage ? <p className="feedback feedback--success">{savedMessage}</p> : null}

            <button className="button button--primary" type="submit">
              {labels.submit}
            </button>
          </form>
        </section>

        <aside className="account-panel account-panel--summary account-panel--full">
          <p className="section__label">{labels.history}</p>
          <h2>{customer.email}</h2>
          {feedbackItems.length > 0 ? (
            <ul className="account-dashboard__list">
              {feedbackItems.map(item => (
                <li key={item.id}>
                  <strong>{item.rating}/5</strong> {item.message}
                </li>
              ))}
            </ul>
          ) : (
            <p>{labels.empty}</p>
          )}
          <Link className="button button--secondary" to="/account">
            {isEnglish ? 'Back to account' : 'Takaisin tilille'}
          </Link>
        </aside>
      </main>
    </div>
  );
}

export default FeedbackPage;
