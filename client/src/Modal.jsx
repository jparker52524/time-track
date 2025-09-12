  import "./Modal.css";
  
  // Simple reusable modal
  function Modal({ title, isOpen, onClose, children }) {
    return (
      <div className={`modal-overlay ${isOpen ? "" : "hidden"}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <button onClick={onClose} className="modal-close">✕</button>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    );
  }

  export default Modal;