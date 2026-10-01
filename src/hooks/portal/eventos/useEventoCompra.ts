'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { eventoComprasService } from '@/services/supabase/portal/eventos-compras.service';
import { getPerfil } from '@/services/supabase/portal/perfil.service';
import {
  PERFIL_CAMPOS_FIJOS,
  compraHoldVigente,
  entradaVendible,
  esEmailValido,
  esFechaNacimientoValida,
  validarComprobante,
  validarImagenFormulario,
  ventaCerradaPorAntelacion,
} from '@/lib/portal/eventos-compra.utils';
import {
  EventoCompraServiceError,
  type CompraResultado,
  type CompradorInput,
  type EntradaVendible,
  type EventoFormularioSnapshot,
} from '@/types/portal/eventos-compras.types';
import type { EventoEntradasModo, EventoPublicoListItem } from '@/types/portal/eventos.types';
import {
  FORMULARIO_PERFIL_CAMPOS,
  HEADER_SECCION_TIPOS,
  type FormularioPerfilCampo,
  type FormularioSeccion,
} from '@/types/portal/formularios.types';

export type EventoCompraPaso = 'entrada' | 'datos' | 'pago' | 'confirmacion';

export type CuponAplicado = { codigo: string; descuentoPct: number; total: number };

/** Why step 1 cannot continue, or null. */
export type EventoCompraBloqueo = 'sin_entradas' | 'venta_cerrada' | 'ya_tiene_entrada' | null;

/** A purchase created by `iniciar_compra_evento` that still needs files / finalizing (kept for "Reintentar"). */
type CompraPendiente = {
  compraId: string;
  tenantId: string;
  createdAt: string;
  comprobantePath: string | null;
  /** campo_nombre → uploaded path. */
  archivos: Record<string, string>;
};

type PerfilUsuarioLike = {
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  tipo_identificacion: string | null;
  numero_identificacion: string | null;
  fecha_exp_identificacion: string | null;
  rh: string | null;
};

/** Raw profile value for a requested field (no units: it is sent as the answer). */
function perfilValor(
  key: FormularioPerfilCampo,
  usuario: PerfilUsuarioLike,
  deportivo: { peso_kg: number | null; altura_cm: number | null } | null,
): string {
  switch (key) {
    case 'telefono':
      return usuario.telefono?.trim() ?? '';
    case 'tipo_identificacion':
      return usuario.tipo_identificacion && usuario.numero_identificacion?.trim()
        ? `${usuario.tipo_identificacion} ${usuario.numero_identificacion.trim()}`
        : '';
    case 'fecha_exp_identificacion':
      return usuario.fecha_exp_identificacion ?? '';
    case 'rh':
      return usuario.rh?.trim() ?? '';
    case 'peso_kg':
      return deportivo?.peso_kg != null ? String(deportivo.peso_kg) : '';
    case 'altura_cm':
      return deportivo?.altura_cm != null ? String(deportivo.altura_cm) : '';
    default:
      return '';
  }
}

function esHeader(seccion: FormularioSeccion): boolean {
  return (HEADER_SECCION_TIPOS as readonly string[]).includes(seccion.seccion_tipo);
}

function mensajeError(error: unknown): string {
  if (error instanceof EventoCompraServiceError) return error.message;
  return 'No se pudo completar la operación. Intenta de nuevo.';
}

type UseEventoCompraOptions = {
  evento: EventoPublicoListItem;
  modo: EventoEntradasModo;
};

/**
 * The whole checkout of `EventoEntradasModal` (US-0121): step state, sellable tickets, coupon, buyer
 * data and the event form (from its snapshot, never the templates), payment method and proof, and
 * the submit sequence `iniciar → uploads → finalizar` with retry on the same purchase.
 * Mounted only while the modal is open, so every open starts clean.
 */
export function useEventoCompra({ evento, modo }: UseEventoCompraOptions) {
  const { user, initializing } = useAuth();
  const esUsuario = modo === 'usuario';
  // Primitive keys: token refreshes replace the `user` object without changing who is buying
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? '';

  // ─── Loaded data ───
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [entradas, setEntradas] = useState<EntradaVendible[]>([]);
  const [bundleNombres, setBundleNombres] = useState<Record<string, string>>({});
  const [formulario, setFormulario] = useState<EventoFormularioSnapshot | null>(null);
  const [yaTieneEntrada, setYaTieneEntrada] = useState(false);

  // ─── Step 1 ───
  const [paso, setPaso] = useState<EventoCompraPaso>('entrada');
  const [entradaId, setEntradaId] = useState<string | null>(null);
  const [cuponInput, setCuponInput] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState<CuponAplicado | null>(null);
  const [cuponError, setCuponError] = useState<string | null>(null);
  const [cuponValidando, setCuponValidando] = useState(false);

  // ─── Step 2 ───
  const [comprador, setComprador] = useState<CompradorInput>({ nombre: '', email: '', emailConfirmacion: '', fechaNacimiento: '' });
  const [perfilValores, setPerfilValores] = useState<Record<string, string>>({});
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [imagenes, setImagenes] = useState<Record<string, File>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Step 3 ───
  const [metodoPagoId, setMetodoPagoId] = useState<string | null>(null);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [comprobanteError, setComprobanteError] = useState<string | null>(null);

  // ─── Submit ───
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // True when `submitError` comes from a failed request (so "Reintentar" makes sense), not from validation
  const [reintentable, setReintentable] = useState(false);
  const [expirada, setExpirada] = useState(false);
  const [resultado, setResultado] = useState<CompraResultado | null>(null);
  const compraRef = useRef<CompraPendiente | null>(null);
  const [compraIniciada, setCompraIniciada] = useState(false);

  // Initial load (and "Reintentar" of a failed load)
  useEffect(() => {
    if (initializing) return;
    let cancelled = false;

    const cargar = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [lista, snapshot, ticket, perfil] = await Promise.all([
          eventoComprasService.listEntradasVendibles(evento.id),
          eventoComprasService.getFormularioEvento(evento.id),
          esUsuario && userId ? eventoComprasService.getMiTicketEnEvento(evento.id) : Promise.resolve(null),
          esUsuario && userId ? getPerfil(userId).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;

        const bundleIds = [...new Set(lista.flatMap((entrada) => (entrada.tipoEntrada === 'multiple' ? entrada.eventosIdBundle : [])))];
        const nombres = await eventoComprasService.listNombresEventosBundle(bundleIds).catch(() => []);
        if (cancelled) return;

        setEntradas(lista);
        setBundleNombres(Object.fromEntries(nombres.map((item) => [item.id, item.nombre])));
        setFormulario(snapshot);
        setYaTieneEntrada(ticket !== null);
        setEntradaId((actual) => actual ?? lista.find((entrada) => entradaVendible(entrada))?.id ?? null);

        if (esUsuario && userId) {
          const usuario = perfil?.usuario ?? null;
          setComprador((actual) => ({
            nombre: actual.nombre || [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim(),
            email: userEmail,
            emailConfirmacion: userEmail,
            fechaNacimiento: actual.fechaNacimiento || (usuario?.fecha_nacimiento ?? ''),
          }));
          if (usuario && snapshot) {
            const prefill: Record<string, string> = {};
            for (const key of snapshot.perfilCamposRequeridos) {
              if (PERFIL_CAMPOS_FIJOS.includes(key)) continue;
              const value = perfilValor(key, usuario, perfil?.deportivo ?? null);
              if (value) prefill[key] = value;
            }
            setPerfilValores((actual) => ({ ...prefill, ...actual }));
          }
        }
      } catch (error) {
        if (cancelled) return;
        console.error('useEventoCompra: load failed', error);
        setLoadError('No se pudieron cargar las entradas del evento.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void cargar();
    return () => {
      cancelled = true;
    };
  }, [evento.id, esUsuario, userId, userEmail, initializing, reloadKey]);

  // ─── Derived ───
  const vendibles = useMemo(() => entradas.filter((entrada) => entradaVendible(entrada)), [entradas]);
  const entrada = vendibles.find((item) => item.id === entradaId) ?? null;
  const total = entrada ? (cuponAplicado?.total ?? entrada.valor) : 0;
  const metodosOnline = useMemo(() => evento.metodosPago.filter((metodo) => metodo.tipo !== 'efectivo'), [evento.metodosPago]);
  const ventaCerrada = ventaCerradaPorAntelacion(evento);

  const bloqueo: EventoCompraBloqueo = loading
    ? null
    : esUsuario && yaTieneEntrada
      ? 'ya_tiene_entrada'
      : ventaCerrada
        ? 'venta_cerrada'
        : vendibles.length === 0
          ? 'sin_entradas'
          : null;

  const camposFormulario = useMemo(() => (formulario?.campos ?? []).filter((campo) => !esHeader(campo)), [formulario]);
  const headerFormulario = useMemo(() => (formulario?.campos ?? []).filter(esHeader), [formulario]);
  const perfilRequeridos = useMemo(
    () =>
      (formulario?.perfilCamposRequeridos ?? [])
        .filter((key) => !PERFIL_CAMPOS_FIJOS.includes(key))
        .map((key) => ({ key, label: FORMULARIO_PERFIL_CAMPOS.find((campo) => campo.key === key)?.label ?? key })),
    [formulario],
  );
  const pasos: EventoCompraPaso[] = total > 0 ? ['entrada', 'datos', 'pago', 'confirmacion'] : ['entrada', 'datos', 'confirmacion'];

  // ─── Step 1 actions ───
  const seleccionarEntrada = useCallback((id: string) => {
    setEntradaId(id);
    setCuponAplicado(null);
    setCuponError(null);
  }, []);

  const cambiarCupon = useCallback((value: string) => {
    setCuponInput(value.toUpperCase());
    setCuponAplicado(null);
    setCuponError(null);
  }, []);

  const aplicarCupon = useCallback(async () => {
    const codigo = cuponInput.trim();
    if (!entrada || entrada.valor <= 0 || !codigo) return;
    setCuponValidando(true);
    setCuponError(null);
    try {
      const result = await eventoComprasService.validarCupon(evento.id, entrada.id, codigo);
      if (result.valido && result.descuentoPct !== null && result.total !== null) {
        setCuponAplicado({ codigo, descuentoPct: result.descuentoPct, total: result.total });
      } else {
        setCuponAplicado(null);
        setCuponError('El cupón no es válido para esta entrada.');
      }
    } catch (error) {
      setCuponError(mensajeError(error));
    } finally {
      setCuponValidando(false);
    }
  }, [cuponInput, entrada, evento.id]);

  const quitarCupon = useCallback(() => {
    setCuponInput('');
    setCuponAplicado(null);
    setCuponError(null);
  }, []);

  // ─── Step 2 actions ───
  const clearError = (key: string) => setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));

  const updateComprador = useCallback((field: keyof CompradorInput, value: string) => {
    setComprador((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  }, []);

  const updatePerfil = useCallback((key: string, value: string) => {
    setPerfilValores((prev) => ({ ...prev, [key]: value }));
    clearError(`perfil.${key}`);
  }, []);

  const updateRespuesta = useCallback((campoNombre: string, value: string) => {
    setRespuestas((prev) => ({ ...prev, [campoNombre]: value }));
    clearError(campoNombre);
  }, []);

  /** Form images stay in memory until the purchase exists (they are uploaded to its folder). */
  const seleccionarImagen = useCallback(async (campoNombre: string, file: File) => {
    const error = validarImagenFormulario(file);
    if (error) {
      setErrors((prev) => ({ ...prev, [campoNombre]: error }));
      return;
    }
    setImagenes((prev) => ({ ...prev, [campoNombre]: file }));
    setRespuestas((prev) => ({ ...prev, [campoNombre]: file.name }));
    clearError(campoNombre);
  }, []);

  const validarDatos = useCallback((): boolean => {
    const next: Record<string, string> = {};
    const nombre = comprador.nombre.trim();
    if (!nombre) next.nombre = 'Escribe tu nombre completo.';
    else if (nombre.length > 150) next.nombre = 'Máximo 150 caracteres.';

    if (!esUsuario) {
      if (!esEmailValido(comprador.email)) next.email = 'Escribe un correo válido.';
      else if (comprador.email.trim().toLowerCase() !== comprador.emailConfirmacion.trim().toLowerCase()) {
        next.emailConfirmacion = 'Los correos no coinciden.';
      }
    }

    if (!esFechaNacimientoValida(comprador.fechaNacimiento)) {
      next.fechaNacimiento = 'Escribe una fecha de nacimiento válida (anterior a hoy).';
    }

    for (const { key } of perfilRequeridos) {
      if (!perfilValores[key]?.trim()) next[`perfil.${key}`] = 'Este campo es obligatorio.';
    }

    for (const campo of camposFormulario) {
      if (campo.seccion_tipo !== 'datos' || !campo.campo_obligatorio || !campo.campo_nombre) continue;
      const value = respuestas[campo.campo_nombre] ?? '';
      const missing =
        campo.campo_tipo === 'checkbox'
          ? value !== 'true'
          : campo.campo_tipo === 'imagen'
            ? !imagenes[campo.campo_nombre]
            : !value.trim();
      if (missing) next[campo.campo_nombre] = 'Este campo es obligatorio.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [comprador, esUsuario, perfilRequeridos, perfilValores, camposFormulario, respuestas, imagenes]);

  // ─── Step 3 actions ───
  const seleccionarMetodoPago = useCallback((id: string) => {
    setMetodoPagoId(id);
    setSubmitError(null);
  }, []);

  const seleccionarComprobante = useCallback((file: File | null) => {
    if (!file) {
      setComprobante(null);
      setComprobanteError(null);
    } else {
      const error = validarComprobante(file);
      setComprobanteError(error);
      setComprobante(error ? null : file);
    }
    // A new file must be uploaded again on the next attempt
    if (compraRef.current) compraRef.current.comprobantePath = null;
  }, []);

  // ─── Submit ───
  const buildRespuestas = useCallback((): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const campo of camposFormulario) {
      if (campo.seccion_tipo !== 'datos' || !campo.campo_nombre || campo.campo_tipo === 'imagen') continue;
      const value = respuestas[campo.campo_nombre]?.trim();
      if (value) result[campo.campo_nombre] = value;
    }
    return result;
  }, [camposFormulario, respuestas]);

  const confirmar = useCallback(async () => {
    if (!entrada || submitting || resultado) return;

    if (total > 0) {
      if (!metodoPagoId || !metodosOnline.some((metodo) => metodo.id === metodoPagoId)) {
        setReintentable(false);
        setSubmitError('Selecciona un método de pago.');
        return;
      }
      if (!comprobante) {
        setComprobanteError('Adjunta el comprobante de pago.');
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);
    setReintentable(false);

    try {
      let compra = compraRef.current;

      if (!compra) {
        const iniciada = await eventoComprasService.iniciarCompra({
          eventoId: evento.id,
          entradaId: entrada.id,
          cupon: cuponAplicado?.codigo ?? null,
          metodoPagoId: total > 0 ? metodoPagoId : null,
          comprador: {
            nombre: comprador.nombre.trim(),
            email: comprador.email.trim(),
            fechaNacimiento: comprador.fechaNacimiento,
          },
          datosPerfil: Object.fromEntries(
            perfilRequeridos.map(({ key }) => [key, perfilValores[key]?.trim() ?? '']).filter(([, value]) => value),
          ),
          respuestas: buildRespuestas(),
        });

        if (!iniciada.requiereArchivos || iniciada.estado !== 'pendiente_pago') {
          setResultado(iniciada);
          setPaso('confirmacion');
          return;
        }

        compra = {
          compraId: iniciada.compraId,
          tenantId: iniciada.tenantId,
          createdAt: iniciada.createdAt,
          comprobantePath: null,
          archivos: {},
        };
        compraRef.current = compra;
        setCompraIniciada(true);
      } else if (!compraHoldVigente(compra.createdAt)) {
        setExpirada(true);
        return;
      }

      if (total > 0 && comprobante && !compra.comprobantePath) {
        compra.comprobantePath = await eventoComprasService.subirArchivoCompra(compra.tenantId, compra.compraId, 'comprobante', comprobante);
      }

      for (const [campoNombre, file] of Object.entries(imagenes)) {
        if (compra.archivos[campoNombre]) continue;
        compra.archivos[campoNombre] = await eventoComprasService.subirArchivoCompra(
          compra.tenantId,
          compra.compraId,
          `campo-${campoNombre}`,
          file,
        );
      }

      const final = await eventoComprasService.finalizarCompra(compra.compraId, compra.comprobantePath, compra.archivos);
      compraRef.current = null;
      setResultado(final);
      setPaso('confirmacion');
    } catch (error) {
      if (error instanceof EventoCompraServiceError && error.code === 'expirada') {
        setExpirada(true);
      } else {
        if (!(error instanceof EventoCompraServiceError) || error.code === 'unknown') {
          console.error('useEventoCompra: submit failed', error);
        }
        setSubmitError(mensajeError(error));
        setReintentable(true);
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    entrada,
    submitting,
    resultado,
    total,
    metodoPagoId,
    metodosOnline,
    comprobante,
    evento.id,
    cuponAplicado,
    comprador,
    perfilRequeridos,
    perfilValores,
    buildRespuestas,
    imagenes,
  ]);

  /** After the 30-min hold expired: forget the purchase and start again at step 1, keeping the data. */
  const reiniciar = useCallback(() => {
    compraRef.current = null;
    setCompraIniciada(false);
    setExpirada(false);
    setSubmitError(null);
    setPaso('entrada');
  }, []);

  // ─── Navigation ───
  const continuar = useCallback(async () => {
    if (paso === 'entrada') {
      if (!entrada || bloqueo) return;
      setPaso('datos');
      return;
    }
    if (paso === 'datos') {
      if (!validarDatos()) return;
      if (total > 0) {
        setPaso('pago');
        return;
      }
      await confirmar();
      return;
    }
    if (paso === 'pago') {
      await confirmar();
    }
  }, [paso, entrada, bloqueo, validarDatos, total, confirmar]);

  const atras = useCallback(() => {
    // Once the purchase exists its data is fixed; only the failed part can be retried
    if (submitting || compraRef.current) return;
    setSubmitError(null);
    setPaso((actual) => (actual === 'pago' ? 'datos' : actual === 'datos' ? 'entrada' : actual));
  }, [submitting]);

  return {
    // data
    loading,
    loadError,
    recargar: () => setReloadKey((key) => key + 1),
    vendibles,
    bundleNombres,
    formulario,
    camposFormulario,
    headerFormulario,
    perfilRequeridos,
    bloqueo,
    metodosOnline,
    // state
    paso,
    pasos,
    entrada,
    total,
    esUsuario,
    cuponInput,
    cuponAplicado,
    cuponError,
    cuponValidando,
    comprador,
    perfilValores,
    respuestas,
    imagenes,
    errors,
    metodoPagoId,
    comprobante,
    comprobanteError,
    submitting,
    submitError,
    reintentable,
    expirada,
    compraIniciada,
    resultado,
    // actions
    seleccionarEntrada,
    cambiarCupon,
    aplicarCupon,
    quitarCupon,
    updateComprador,
    updatePerfil,
    updateRespuesta,
    seleccionarImagen,
    setMetodoPagoId: seleccionarMetodoPago,
    seleccionarComprobante,
    continuar,
    atras,
    confirmar,
    reiniciar,
  };
}

export type UseEventoCompraResult = ReturnType<typeof useEventoCompra>;
