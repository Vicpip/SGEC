import { useState } from 'react'
import { AlertTriangle, Check, Copy, Download } from 'lucide-react'

// Una celda que empieza con = + - @ (o tabulador/retorno) se interpretaría como fórmula
// al abrir el CSV en Excel; se neutraliza anteponiendo un apóstrofo. Los datos vienen de
// la lista que capturó o importó el profesor.
function celdaCsv(valor) {
  let texto = String(valor ?? '')
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`
  return `"${texto.replace(/"/g, '""')}"`
}

function aCsv(credenciales) {
  const filas = [
    ['boleta', 'nombre', 'correo_institucional', 'contrasena_temporal'],
    ...credenciales.map((c) => [c.boleta, c.nombre, c.correo_institucional, c.contrasena_temporal]),
  ]
  return filas.map((fila) => fila.map(celdaCsv).join(',')).join('\r\n')
}

function aTexto(credenciales) {
  return credenciales
    .map((c) => `${c.boleta}\t${c.nombre}\t${c.correo_institucional}\t${c.contrasena_temporal}`)
    .join('\n')
}

// Contraseñas temporales recién generadas (alta manual, importación o "Restablecer
// acceso"). El servidor solo las entrega en esa respuesta y guarda únicamente su hash:
// si el profesor cierra esta vista sin copiarlas o descargarlas, la única salida es
// restablecer el acceso del alumno.
// `credenciales` = [{ boleta, nombre, correo_institucional, contrasena_temporal }]
export default function CredencialesTemporales({ credenciales }) {
  const [copiado, setCopiado] = useState(false)
  const [errorCopia, setErrorCopia] = useState('')

  if (!credenciales || credenciales.length === 0) return null

  async function copiar() {
    setErrorCopia('')
    try {
      await navigator.clipboard.writeText(aTexto(credenciales))
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch (err) {
      setErrorCopia('No se pudo copiar al portapapeles; selecciona el texto de la tabla o descarga el CSV')
    }
  }

  function descargarCsv() {
    // BOM para que Excel abra los acentos en UTF-8.
    const BOM = String.fromCharCode(0xfeff)
    const blob = new Blob([BOM, aCsv(credenciales)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = 'credenciales_temporales_sgec.csv'
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  return (
    <div className="credenciales">
      <div className="credenciales-aviso">
        <AlertTriangle className="icon-sm" />
        <div>
          <strong>Estas contraseñas temporales no se volverán a mostrar.</strong> Cópialas o descarga el CSV antes
          de cerrar y entrégalas a cada alumno. Al iniciar sesión por primera vez, el sistema les pedirá cambiarla.
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Boleta</th>
              <th>Alumno</th>
              <th>Correo institucional</th>
              <th>Contraseña temporal</th>
            </tr>
          </thead>
          <tbody>
            {credenciales.map((c) => (
              <tr key={c.correo_institucional}>
                <td className="td-bold">{c.boleta}</td>
                <td>{c.nombre}</td>
                <td className="text-sm">{c.correo_institucional}</td>
                <td>
                  <code className="credenciales-clave">{c.contrasena_temporal}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errorCopia && (
        <div className="login-error" style={{ marginTop: 12 }}>
          {errorCopia}
        </div>
      )}

      <div className="form-actions" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={copiar}>
          {copiado ? <Check className="icon-sm" /> : <Copy className="icon-sm" />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={descargarCsv}>
          <Download className="icon-sm" />
          Descargar CSV
        </button>
      </div>
    </div>
  )
}
