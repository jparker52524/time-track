  import "./Modal.css";
  
  // Simple reusable modal
  function Modal({ title, isOpen, onClose, children }) {
    return (
      <div className={`modal-overlay ${isOpen ? "" : "hidden"}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="text-xl font-bold">{title}</h2>
            <button onClick={onClose} className="text-gray-600 hover:text-black">✕</button>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    );
  }

  export default Modal;