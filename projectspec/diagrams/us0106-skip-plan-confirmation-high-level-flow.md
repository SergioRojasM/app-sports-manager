# US-0106 — Flujo a alto nivel: reserva de un entrenamiento público sin plan activo

Vista general del proceso, sin detalles técnicos, comparando qué pasa cuando la organización **permite reservar sin confirmar el plan** y cuando **no lo permite**.

```mermaid
flowchart TD
    A[Atleta quiere reservar<br/>un entrenamiento público] --> B{Tiene el plan o<br/>servicio requerido?}

    B -- Sí --> C[Reserva confirmada<br/>de inmediato]

    B -- No --> D{La organización permite<br/>reservar mientras se<br/>aprueba el plan?}

    D -- No --> E[No puede reservar]
    E --> F[Debe elegir y<br/>solicitar un plan]
    F --> G[Espera a que la<br/>organización lo apruebe]
    G --> H[Vuelve a intentar<br/>la reserva más tarde]
    H --> B

    D -- Sí --> I[Elige y solicita un plan]
    I --> J[Completa la reserva<br/>en el mismo momento]
    J --> K[Reserva y solicitud de<br/>plan quedan pendientes<br/>de aprobación]

    K --> L{La organización<br/>revisa la solicitud}
    L -- Aprueba --> M[El plan se activa y<br/>la reserva se confirma<br/>automáticamente]
    L -- Rechaza --> N[Le informan al atleta<br/>el motivo del rechazo]
    N --> O[Atleta corrige y<br/>reenvía su solicitud]
    O --> L
    N --> P[La reserva queda cancelada:<br/>si el plan se aprueba después,<br/>debe reservar de nuevo]

    style C fill:#0d5c3f,color:#fff
    style M fill:#0d5c3f,color:#fff
    style E fill:#5c1a1a,color:#fff
    style P fill:#5c1a1a,color:#fff
```

## Resumen de los dos caminos

| | Organización **no** permite reservar sin plan | Organización **sí** permite reservar sin plan |
|---|---|---|
| Atleta sin plan | No puede reservar hasta que le aprueben el plan | Puede reservar de inmediato |
| Reserva | Se crea solo después de tener el plan aprobado | Se crea junto con la solicitud del plan, ambas pendientes |
| Aprobación del plan | El atleta debe volver a reservar manualmente | La reserva se confirma sola |
| Rechazo del plan | No aplica (nunca llegó a reservar) | La reserva se cancela; el atleta ve el motivo y, si corrige el plan, debe reservar de nuevo |

Referencias: [US-0106](../userstory/us0106-skip-plan-confirmation-public-trainings.md) · [Flujograma técnico](./us0106-skip-plan-confirmation-flowchart.md)
