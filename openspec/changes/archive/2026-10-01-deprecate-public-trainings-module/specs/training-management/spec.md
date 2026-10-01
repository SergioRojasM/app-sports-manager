## REMOVED Requirements

### Requirement: Training instance visibility assignment
**Reason**: Trainings are private to the owning tenant (US-0123). The events module is the only public offering.
**Migration**: None for users. `entrenamientos.visibilidad` and `visible_para` stay in the table with value `privado` / `tenant_id` until US-0124 drops them; application code no longer reads or writes `visibilidad`. Access rules are defined by the `training-member-only-access` capability.

### Requirement: Server-side visible_para computation
**Reason**: Trainings are private to the owning tenant (US-0123). The events module is the only public offering.
**Migration**: None for users. `entrenamientos.visibilidad` and `visible_para` stay in the table with value `privado` / `tenant_id` until US-0124 drops them; application code no longer reads or writes `visibilidad`. Access rules are defined by the `training-member-only-access` capability.

### Requirement: Visibility-based cross-tenant data access
**Reason**: Trainings are private to the owning tenant (US-0123). The events module is the only public offering.
**Migration**: None for users. `entrenamientos.visibilidad` and `visible_para` stay in the table with value `privado` / `tenant_id` until US-0124 drops them; application code no longer reads or writes `visibilidad`. Access rules are defined by the `training-member-only-access` capability.

### Requirement: Visibility propagation in series sync
**Reason**: Trainings are private to the owning tenant (US-0123). The events module is the only public offering.
**Migration**: None for users. `entrenamientos.visibilidad` and `visible_para` stay in the table with value `privado` / `tenant_id` until US-0124 drops them; application code no longer reads or writes `visibilidad`. Access rules are defined by the `training-member-only-access` capability.

### Requirement: Visibility badge in training list view
**Reason**: Trainings are private to the owning tenant (US-0123). The events module is the only public offering.
**Migration**: None for users. `entrenamientos.visibilidad` and `visible_para` stay in the table with value `privado` / `tenant_id` until US-0124 drops them; application code no longer reads or writes `visibilidad`. Access rules are defined by the `training-member-only-access` capability.

### Requirement: Visibility color coding and legend in calendar view
**Reason**: Trainings are private to the owning tenant (US-0123). The events module is the only public offering.
**Migration**: None for users. `entrenamientos.visibilidad` and `visible_para` stay in the table with value `privado` / `tenant_id` until US-0124 drops them; application code no longer reads or writes `visibilidad`. Access rules are defined by the `training-member-only-access` capability.
