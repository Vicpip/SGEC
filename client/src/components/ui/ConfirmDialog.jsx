import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'

// Diálogo de confirmación reutilizable. Obligatorio antes de cualquier baja (cerrar
// materia, desactivar equipo, actividad, profesor o semestre, dar de baja a un alumno).
//
// `onConfirmar` puede ser async: mientras se resuelve, el diálogo bloquea sus botones; si
// rechaza, muestra el mensaje del servidor (`error` de la respuesta) sin cerrarse, para que
// el usuario lea por qué no procedió. Quien lo usa lo desmonta al terminar con éxito.
// `children` es el texto que explica la consecuencia de confirmar.
export default function ConfirmDialog({
  titulo,
  children,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  mensajeError = 'No se pudo completar la operación',
  onConfirmar,
  onCancelar,
}) {
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function alPresionar(e) {
      if (e.key === 'Escape' && !procesando) onCancelar()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [procesando, onCancelar])

  async function handleConfirmar() {
    setProcesando(true)
    setError('')
    try {
      await onConfirmar()
    } catch (err) {
      setError(err.response?.data?.error || mensajeError)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={procesando ? undefined : onCancelar}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle className="icon-sm" style={{ color: 'var(--red)' }} />
            {titulo}
          </span>
          <button type="button" className="modal-close" onClick={onCancelar} aria-label="Cerrar" disabled={procesando}>
            <X className="icon-sm" />
          </button>
        </div>
        <div className="card-body" style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6 }}>
          {children}
          {error && (
            <div className="login-error" style={{ marginTop: 12, textAlign: 'left' }}>
              {error}
            </div>
          )}
        </div>
        <div className="card-header" style={{ borderTop: '1px solid var(--gray-100)', borderBottom: 'none' }}>
          <div className="form-actions" style={{ width: '100%' }}>
            <button type="button" className="btn btn-secondary" onClick={onCancelar} disabled={procesando}>
              {textoCancelar}
            </button>
            <button type="button" className="btn btn-danger" onClick={handleConfirmar} disabled={procesando}>
              {procesando ? <Loader2 className="icon-sm spin" /> : textoConfirmar}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
