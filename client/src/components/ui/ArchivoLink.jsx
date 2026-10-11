import { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { descargarArchivo } from '../../services/archivos.service'

const SE_ABRE_EN_PESTANA = /\.(pdf|png|jpe?g)$/i

const MENSAJE_POR_ESTATUS = {
  403: 'No tienes permiso para abrir este archivo',
  404: 'El archivo ya no está disponible',
}

function guardarComo(url, nombre) {
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
}

// Chip clicable de un archivo adjunto (.file-chip). Descarga el archivo con el token de
// la sesión (ver archivos.service.js): PDF e imágenes se abren en una pestaña nueva, el
// resto se guarda con su nombre original.
// `tipo` = 'actividad' | 'entrega' | 'aviso'; `id` = PK del archivo; `icon` = ícono lucide.
export default function ArchivoLink({ tipo, id, nombre, icon: Icon = FileText }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function abrir(e) {
    e.stopPropagation()
    if (cargando) return

    // La pestaña se abre de forma síncrona, dentro del clic: si se abriera después de
    // esperar la descarga, el navegador la trataría como ventana emergente y la bloquearía.
    const pestana = SE_ABRE_EN_PESTANA.test(nombre) ? window.open('', '_blank') : null

    setCargando(true)
    setError('')
    try {
      const blob = await descargarArchivo(tipo, id)
      const url = URL.createObjectURL(blob)
      if (pestana) {
        pestana.location.href = url
      } else {
        guardarComo(url, nombre)
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      pestana?.close()
      setError(MENSAJE_POR_ESTATUS[err.response?.status] ?? 'No se pudo descargar el archivo')
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="file-chip archivo-link"
        onClick={abrir}
        disabled={cargando}
        title={`Abrir ${nombre}`}
      >
        {cargando ? <Loader2 className="icon-sm spin" /> : <Icon className="icon-sm" />}
        <span>{nombre}</span>
      </button>
      {error && <span className="archivo-link-error">{error}</span>}
    </>
  )
}
