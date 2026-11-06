import { useEffect, useRef } from 'react';

export default function Confirmation({ request, resolve }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus?.(); };
  }, []);
  return <dialog ref={ref} className="confirmation" aria-labelledby="confirm-title" aria-describedby="confirm-message" onCancel={event => { event.preventDefault(); resolve(false); }}>
    <h2 id="confirm-title">{request.title}</h2><p id="confirm-message">{request.message}</p>
    <div className="confirm-actions"><button className="secondary" autoFocus onClick={() => resolve(false)}>Cancel</button><button onClick={() => resolve(true)}>{request.label}</button></div>
  </dialog>;
}
