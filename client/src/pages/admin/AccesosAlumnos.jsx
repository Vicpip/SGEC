// Pantalla de administración — Accesos de alumnos
// Rol: Administrador
// URL: /admin/accesos
// Descripción: Busca un alumno por correo institucional o boleta y restablece su acceso
// (genera una contraseña temporal que se muestra una sola vez). Es el camino para un alumno
// que ya activó su cuenta y olvidó su contraseña: su profesor ya no puede restablecerla.
//
// NOTA: no forma parte de las 19 pantallas oficiales; se agregó en la Sesión 15 del plan de
// cierre porque el endpoint de restablecimiento del Administrador no tenía pantalla.

import { useState } from 'react'
import { Search, KeyRound, Loader2, Users, X } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import CredencialesTemporales from '../../components/ui/CredencialesTemporales'
import * as alumnosService from '../../services/alumnos.service'

const MIN_CARACTERES = 3

export default function AccesosAlumnos() {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')
  const [alumnoARestablecer, setAlumnoARestablecer] = useState(null)
  // Contraseña temporal recién generada: [{ boleta, nombre, correo_institucional, contrasena_temporal }]
  const [credenciales, setCredenciales] = useState(null)

  async function buscar(e) {
    e?.preventDefault()
    const q = texto.trim()
    if (q.length < MIN_CARACTERES) {
      setError(`Escribe al menos ${MIN_CARACTERES} caracteres del correo o la boleta`)
      return
    }
    setBuscando(true)
    setError('')
    try {
      setResultados(await alumnosService.buscarAlumnos(q))
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo realizar la búsqueda')
      setResultados(null)
    } finally {
      setBuscando(false)
    }
  }

  async function handleConfirmarRestablecer() {
    const nuevas = await alumnosService.restablecerAcceso(alumnoARestablecer.id_alumno)
    setAlumnoARestablecer(null)
    setCredenciales(nuevas)
    // La cuenta queda otra vez con acceso pendiente (debe cambiar la contraseña temporal).
    setResultados((prev) => prev?.map((a) => (a.id_alumno === nuevas[0]?.id_alumno ? { ...a, acceso_pendiente: true } : a)) ?? prev)
  }

  return (
    <PageWrapper title="Accesos de alumnos">
      <div className="card mb20">
        <div className="card-header">
          <span className="card-title">Buscar alumno</span>
        </div>
        <form className="card-body" onSubmit={buscar}>
          <div style={{ fontSize: 12.5, color: 'var(--gray-600)', marginBottom: 14, lineHeight: 1.5 }}>
            Restablece el acceso de un alumno que olvidó su contraseña. Se genera una contraseña temporal que debes
            entregarle; al iniciar sesión el sistema le pedirá cambiarla.
          </div>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <div className="search-wrap">
              <Search className="icon-sm" />
              <input
                className="search-input"
                placeholder="Correo institucional o boleta…"
                value={texto}
                maxLength={150}
                onChange={(e) => setTexto(e.target.value)}
                aria-label="Correo institucional o boleta"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={buscando}>
              {buscando ? <Loader2 className="icon-sm spin" /> : <Search className="icon-sm" />}
              Buscar
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="login-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {resultados && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Resultados</span>
            <Badge variant="blue">{resultados.length}</Badge>
          </div>
          {resultados.length === 0 ? (
            <EmptyState icon={Users} title="Sin coincidencias" description="Revisa el correo o la boleta e intenta de nuevo." />
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Boleta</th>
                      <th>Alumno</th>
                      <th>Correo institucional</th>
                      <th>Cuenta</th>
                      <th>Acceso</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((a) => (
                      <tr key={a.id_alumno}>
                        <td className="td-bold">{a.boleta}</td>
                        <td>{a.nombre}</td>
                        <td className="text-sm">{a.correo_institucional}</td>
                        <td>
                          <Badge variant={a.activo ? 'green' : 'gray'}>{a.activo ? 'Activa' : 'Inactiva'}</Badge>
                        </td>
                        <td>
                          <Badge variant={a.acceso_pendiente ? 'yellow' : 'blue'}>
                            {a.acceso_pendiente ? 'Contraseña temporal' : 'Cuenta activada'}
                          </Badge>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setAlumnoARestablecer(a)}
                            disabled={!a.activo}
                            title={a.activo ? undefined : 'La cuenta está inactiva'}
                          >
                            <KeyRound className="icon-sm" />
                            Restablecer acceso
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {resultados.length >= 10 && (
                <div className="text-xs" style={{ padding: '10px 20px' }}>
                  Se muestran como máximo 10 resultados. Escribe más caracteres para acotar la búsqueda.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {alumnoARestablecer && (
        <ConfirmDialog
          titulo="Restablecer acceso"
          textoConfirmar="Restablecer"
          mensajeError="No se pudo restablecer el acceso"
          onCancelar={() => setAlumnoARestablecer(null)}
          onConfirmar={handleConfirmarRestablecer}
        >
          Se generará una contraseña temporal nueva para <strong>{alumnoARestablecer.nombre}</strong> (
          {alumnoARestablecer.boleta}). <strong>Su contraseña actual dejará de funcionar</strong> y deberá cambiar la
          temporal en su siguiente inicio de sesión. La contraseña se mostrará una sola vez.
        </ConfirmDialog>
      )}

      {credenciales && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 720 }} role="dialog" aria-modal="true" aria-label="Acceso restablecido">
            <div className="card-header">
              <span className="card-title">Acceso restablecido</span>
              <button type="button" className="modal-close" onClick={() => setCredenciales(null)} aria-label="Cerrar">
                <X className="icon-sm" />
              </button>
            </div>
            <div className="card-body">
              <CredencialesTemporales credenciales={credenciales} />
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
