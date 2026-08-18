import { Eye, Pencil, Trash2 } from 'lucide-react'

// Botones de acción por fila de tabla (.actions / .action-btn). Cada handler es opcional:
// solo se renderiza el botón cuyo handler fue provisto. Orden fijo: ver, editar, eliminar.
export default function ActionButtons({ onView, onEdit, onDelete }) {
  return (
    <div className="actions">
      {onView && (
        <div className="action-btn action-view" role="button" tabIndex={0} onClick={onView}>
          <Eye className="icon-sm" />
        </div>
      )}
      {onEdit && (
        <div className="action-btn action-edit" role="button" tabIndex={0} onClick={onEdit}>
          <Pencil className="icon-sm" />
        </div>
      )}
      {onDelete && (
        <div className="action-btn action-del" role="button" tabIndex={0} onClick={onDelete}>
          <Trash2 className="icon-sm" />
        </div>
      )}
    </div>
  )
}
