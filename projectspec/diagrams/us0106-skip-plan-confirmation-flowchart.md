# US-0106 — Flujograma: Omitir confirmación de plan al publicar entrenamientos

Diagrama de los dos escenarios posibles una vez que un atleta reserva un entrenamiento público publicado con `omitir_confirmacion_plan = true` y no cuenta con el plan/servicio requerido.

## Escenario 1 — El administrador aprueba el plan pendiente

```mermaid
flowchart TD
    A[Atleta intenta reservar<br/>entrenamiento público] --> B{validateBookingRestrictions}
    B -- "Cumple requisitos" --> Z1[Reserva se crea<br/>estado = confirmada]
    B -- "SERVICIO_REQUERIDO /<br/>UNIDADES_AGOTADAS" --> C{omitir_confirmacion_plan<br/>= true en la publicación?}
    C -- No --> D[Reserva bloqueada<br/>Ver planes de la organización]
    C -- "Sí (reverificado<br/>en servidor)" --> E[Atleta elige un plan<br/>y lo solicita]
    E --> F[Se crea suscripción<br/>estado = pendiente]
    F --> G[Se crea pago<br/>estado = pendiente]
    G --> H[Atleta completa el<br/>formulario de reserva]
    H --> I["book_and_deduct_service_units<br/>p_permitir_pendiente = true<br/>p_suscripcion_id = suscripción"]
    I --> J[Reserva creada<br/>estado = pendiente<br/>vinculada a la suscripción]

    J --> K[Administrador revisa<br/>el pago pendiente]
    K --> L{Aprueba el pago<br/>y la suscripción?}
    L -- Sí --> M[suscripciones.estado = activa]
    M --> N["confirm_pending_reservas_for_suscripcion"]
    N --> O{Hay unidades<br/>disponibles?}
    O -- Sí --> P[Reserva → estado = confirmada<br/>Se descuenta la unidad<br/>Se registra en reserva_servicios]
    O -- No --> Q[Reserva permanece<br/>en pendiente<br/>revisión manual del admin]

    style P fill:#0d5c3f,color:#fff
    style Q fill:#7a5b00,color:#fff
    style D fill:#5c1a1a,color:#fff
```

## Escenario 2 — El administrador rechaza el pago pendiente

```mermaid
flowchart TD
    J[Reserva creada<br/>estado = pendiente<br/>vinculada a la suscripción] --> K[Administrador revisa<br/>el pago pendiente]
    K --> R{Rechaza el pago?}
    R -- Sí --> S[Admin ingresa un motivo<br/>obligatorio]
    S --> T[pagos.estado = rechazado<br/>pagos.motivo_rechazo = motivo]
    T --> U["reject_pending_reservas_for_suscripcion"]
    U --> V[Reserva → estado = rechazada<br/>reservas.motivo_rechazo = motivo]
    V --> W[Atleta ve el motivo en<br/>Mis Reservas y en Mis Suscripciones]

    W --> X{Atleta resube<br/>el comprobante?}
    X -- Sí --> Y[pagos.estado vuelve<br/>a pendiente<br/>motivo_rechazo se limpia]
    Y --> K

    X -- No --> AA[Solicitud queda<br/>sin resolver]

    V -.-> AB[La reserva rechazada<br/>NUNCA se reactiva<br/>automáticamente]
    Y -.-> AC{Eventualmente<br/>se aprueba el plan?}
    AC -- Sí --> AD[El atleta debe crear<br/>una reserva NUEVA<br/>para ese entrenamiento]

    style V fill:#5c1a1a,color:#fff
    style AB fill:#5c1a1a,color:#fff
    style AD fill:#7a5b00,color:#fff
```

## Notas clave

- La validación de `omitir_confirmacion_plan` se hace **siempre en el servidor** (`reservas.service.ts` `create()`), nunca confiando únicamente en el flag enviado por el cliente.
- Todas las demás restricciones (horario, estado de membresía, nivel de disciplina, cupo, reserva duplicada) se siguen validando igual que hoy; solo se omite el requisito de plan/servicio.
- Las reservas en estado `rechazada` se excluyen de los conteos de cupo y de la validación de reserva duplicada, igual que las `cancelada`.
- Cancelar una suscripción que todavía está `pendiente` (en vez de rechazar el pago) dispara la misma cascada de rechazo (`reject_pending_reservas_for_suscripcion`).

Referencias: [US-0106](../userstory/us0106-skip-plan-confirmation-public-trainings.md) · `openspec/changes/skip-plan-confirmation-public-trainings/`
