## REMOVED Requirements

### Requirement: Publish-time skip-confirmation toggle
**Reason**: Trainings can no longer be published, and the only caller of the skip-confirmation booking path (the public training booking modal) was removed (US-0123).
**Migration**: A booking that fails a service or units restriction is rejected, per `training-booking-restrictions`. Bookings already in `pendiente` keep being confirmed or rejected by the remaining requirements of this capability until US-0124.

### Requirement: Booking continues as pending when only the plan/service requirement fails
**Reason**: Trainings can no longer be published, and the only caller of the skip-confirmation booking path (the public training booking modal) was removed (US-0123).
**Migration**: A booking that fails a service or units restriction is rejected, per `training-booking-restrictions`. Bookings already in `pendiente` keep being confirmed or rejected by the remaining requirements of this capability until US-0124.

### Requirement: Server-side re-verification of the skip-confirmation flag
**Reason**: Trainings can no longer be published, and the only caller of the skip-confirmation booking path (the public training booking modal) was removed (US-0123).
**Migration**: A booking that fails a service or units restriction is rejected, per `training-booking-restrictions`. Bookings already in `pendiente` keep being confirmed or rejected by the remaining requirements of this capability until US-0124.
