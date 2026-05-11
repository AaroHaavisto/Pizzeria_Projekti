function OrderConfirmationModal({isOpen, onConfirm, onCancel, isEnglish}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEnglish ? 'No user' : 'Ei käyttäjää'}</h2>
          <button
            className="modal-close"
            type="button"
            onClick={onCancel}
            aria-label={isEnglish ? 'Close dialog' : 'Sulje dialogi'}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-info-text">
            {isEnglish
              ? 'If you order without a user account, you cannot view your order.'
              : 'Jos tilaat ilman käyttäjää, et voi katsoa tilaustasi.'}
          </p>

          <p className="modal-info-text">
            {isEnglish ? 'Are you sure?' : 'Oletko varma?'}
          </p>
        </div>

        <div className="modal-actions">
          <button
            className="button button--primary"
            type="button"
            onClick={onConfirm}
          >
            {isEnglish ? 'Yes' : 'Kyllä'}
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={onCancel}
          >
            {isEnglish ? 'No' : 'Ei'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderConfirmationModal;
