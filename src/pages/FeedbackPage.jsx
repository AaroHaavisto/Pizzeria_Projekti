import {useEffect, useMemo, useState} from 'react';
import {Link, Navigate} from 'react-router-dom';
import Navigation from '../components/Navigation';
import {createFeedback, fetchCustomerFeedback} from '../api/feedbackApi';
import {useCustomerSession} from '../contexts/CustomerSessionContext';
import {useLanguage} from '../contexts/LanguageContext';
import '../css/auth_style.css';

const RATING_VALUES = [1, 2, 3, 4, 5];

function FeedbackPage() {
  const {customer} = useCustomerSession();
  const {language} = useLanguage();
  const isEnglish = language === 'en';
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
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
            ratingDescriptions: {
              1: 'Not great',
              2: 'Missing something',
              3: 'Average',
              4: 'Good',
              5: 'Great',
            },
            message: 'Anything else to add',
            submit: 'Send feedback',
            saved: 'Feedback saved.',
            history: 'Recent feedback',
            empty: 'No feedback sent yet.',
            messagePlaceholder: 'Write anything else you would like to share.',
            back: 'Back to account',
            starsAria: score => `Rate ${score} out of 5`,
          }
        : {
            eyebrow: 'Palaute',
            title: 'Anna palautetta kirjautuneena.',
            text: 'Voit kommentoida palveluistamme.',
            rating: 'Arvio',
            ratingDescriptions: {
              1: 'En tykkää',
              2: 'Jotain puuttuu',
              3: 'Keskiverto',
              4: 'Hyvä',
              5: 'Mahtava',
            },
            message: 'Muuta sanottavaa',
            submit: 'Lähetä palaute',
            saved: 'Palaute tallennettu.',
            history: 'Viimeisimmät palautteet',
            empty: 'Palautetta ei ole vielä lähetetty.',
            messagePlaceholder: 'Kirjoita tähän muuta sanottavaa.',
            back: 'Takaisin tilille',
            starsAria: score => `Arvioi ${score} / 5 tähteä`,
          },
    [isEnglish]
  );

  const ratingDescription = labels.ratingDescriptions[rating] ?? labels.ratingDescriptions[5];

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
        rating,
        message: trimmedMessage,
      });

      setFeedbackItems(previousItems => [savedFeedback, ...previousItems].slice(0, 10));
      setMessage('');
      setRating(5);
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
        <section className="account-panel account-panel--form account-panel--full feedback-panel">
          <p className="section__label">{customer.name}</p>
          <form className="account-form" onSubmit={handleSubmit}>
            <label className="field feedback-rating-field">
              <span>{labels.rating}</span>
              <div className="rating-stars" role="radiogroup" aria-label={labels.rating}>
                {RATING_VALUES.map(score => {
                  const isFilled = score <= rating;

                  return (
                    <button
                      key={score}
                      className={`rating-stars__button ${isFilled ? 'rating-stars__button--filled' : ''}`}
                      type="button"
                      onClick={() => setRating(score)}
                      aria-label={labels.starsAria(score)}
                      aria-pressed={rating === score}
                    >
                      {isFilled ? '★' : '☆'}
                    </button>
                  );
                })}
              </div>
              <p className="rating-stars__hint">
                <span>{rating}/5</span>
                <span>{ratingDescription}</span>
              </p>
            </label>

            <label className="field">
              <span>{labels.message}</span>
              <textarea
                className="feedback-textarea"
                rows="7"
                value={message}
                onChange={event => setMessage(event.target.value)}
                placeholder={labels.messagePlaceholder}
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
                <li key={item.id} className="feedback-history__item">
                  <div className="feedback-history__rating">
                    <strong>{item.rating}/5</strong>
                    <span>{labels.ratingDescriptions[item.rating] ?? labels.ratingDescriptions[5]}</span>
                  </div>
                  <p>{item.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>{labels.empty}</p>
          )}
          <Link className="button button--secondary" to="/account">
            {labels.back}
          </Link>
        </aside>
      </main>
    </div>
  );
}

export default FeedbackPage;
