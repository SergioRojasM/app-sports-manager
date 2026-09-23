export type AnaliticaPreset = '30d' | '90d' | '6m' | 'month' | 'custom';

export type AnaliticaDateRange = {
  dateFrom: string;
  dateTo: string;
  preset: AnaliticaPreset;
};

export type AnaliticaRevenueBreakdown = {
  /** Distinct subscriptions behind the payments. */
  subscriptionCount: number;
  /** Validated + pending payments. */
  paymentCount: number;
  totalRevenue: number;
  recognizedRevenue: number;
  pendingRevenue: number;
};

/** Per-training averages shared by the monthly, discipline and public/private breakdowns. */
export type AnaliticaTrainingAverages = {
  averageOccupancyPercent: number | null;
  averageAttendancePercent: number | null;
};

export type AnaliticaRevenue = {
  recognizedRevenue: number;
  previousPeriodRevenue: number;
  revenueChangePercent: number | null;
  yearToDateRevenue: number;
  pendingPaymentCount: number;
  pendingPaymentAmount: number;
  /** Validated + pending in range (rejected excluded) = recognizedRevenue + pendingPaymentAmount. */
  totalRevenue: number;
  /** totalRevenue ÷ calendar months overlapping the range. */
  averageMonthlyRevenue: number;
  /** Validated + pending from the 1st of dateTo's month to dateTo (not clipped to dateFrom). */
  monthToDateRevenue: number;
  monthlyRevenue: Array<{
    monthStart: string;
    monthKey: string;
    /** Whole calendar month (not clipped to the range), as in phase one. */
    recognizedRevenue: number;
    cumulativeRevenue: number;
    /** Pending amount in the month, clipped to the range. */
    pendingRevenue: number;
    /** Validated + pending in the month, clipped to the range; sums to totalRevenue. */
    totalRevenue: number;
  }>;
  /** Breakdowns over validated + pending payments in range (rejected excluded). */
  revenueByPlan: Array<AnaliticaRevenueBreakdown & {
    planName: string;
    planTypeName: string | null;
  }>;
  revenueByPaymentMethod: Array<AnaliticaRevenueBreakdown & {
    paymentMethodName: string;
  }>;
  topAthletesByRevenue: Array<AnaliticaRevenueBreakdown & {
    athleteId: string;
    athleteName: string;
  }>;
};

export type AnaliticaOperations = {
  scheduledTrainingCount: number;
  /** Valid bookings on non-cancelled sessions ÷ non-cancelled sessions. */
  averageBookingsPerTraining: number;
  /** Mean of per-session occupancy (sessions with capacity); null when none. */
  averageOccupancyPercent: number | null;
  /** Mean of per-session attendance (past sessions with bookings); null when none. */
  averageAttendancePercent: number | null;
  monthlyBookingAverage: Array<AnaliticaTrainingAverages & {
    monthStart: string;
    monthKey: string;
    scheduledTrainingCount: number;
    validBookingCount: number;
    averageBookingsPerTraining: number;
  }>;
  /** scheduledTrainingCount ÷ months in range. */
  averageMonthlyTrainings: number;
  /** validBookingCount ÷ months in range. */
  averageMonthlyBookings: number;
  offeredCapacity: number;
  validBookingCount: number;
  cancelledBookingCount: number;
  occupancyPercent: number | null;
  trainingsWithoutCapacity: number;
  bookingByDiscipline: Array<AnaliticaTrainingAverages & {
    disciplineName: string;
    trainingCount: number;
    validBookingCount: number;
    cancelledBookingCount: number;
    offeredCapacity: number;
    occupancyPercent: number | null;
  }>;
  bookingByPublicStatus: Array<AnaliticaTrainingAverages & {
    /** "Público" (published to the marketplace) or "Privado". */
    label: string;
    trainingCount: number;
    validBookingCount: number;
    occupancyPercent: number | null;
  }>;
  topAthletesByBookings: Array<{
    athleteId: string;
    athleteName: string;
    validBookingCount: number;
    cancellationCount: number;
    attendanceCount: number;
  }>;
  /** Active athletes with the fewest valid bookings in range, including 0. */
  bottomAthletesByBookings: Array<{
    athleteId: string;
    athleteName: string;
    validBookingCount: number;
    attendanceCount: number;
  }>;
  upcomingCapacityAlerts: Array<{
    trainingId: string;
    sessionAt: string;
    disciplineName: string | null;
    scenarioName: string | null;
    capacity: number;
    validBookingCount: number;
    remainingCapacity: number;
    occupancyPercent: number;
  }>;
};

/** Athletes only (role `usuario`). */
export type AnaliticaTeam = {
  membersByStatus: Record<string, number>;
  activeAthleteCount: number;
  activeAthletesByPlan: Array<{
    planName: string;
    athleteCount: number;
  }>;
  activeAthletesByPlanType: Array<{
    planTypeName: string;
    athleteCount: number;
  }>;
  activeAthletesWithoutSubscriptionCount: number;
  membersWithoutSubscription: Array<{
    athleteId: string;
    athleteName: string;
    membershipStatus: string;
    /** Bogotá session date of the latest non-cancelled booking. */
    latestBookingDate: string | null;
    /** Bogotá sale date of the latest subscription, any state. */
    latestSubscriptionDate: string | null;
  }>;
};

/** Subscriptions created in range, excluding cancelled ones, any payment state. */
export type AnaliticaSubscriptions = {
  soldCount: number;
  monthlySold: Array<{
    monthStart: string;
    monthKey: string;
    subscriptionCount: number;
    withValidatedPaymentCount: number;
    withoutValidatedPaymentCount: number;
  }>;
  soldByPlan: Array<{
    planName: string;
    subscriptionCount: number;
  }>;
};

export type AnaliticaDashboard = {
  revenue: AnaliticaRevenue;
  operations: AnaliticaOperations;
  team: AnaliticaTeam;
  subscriptions: AnaliticaSubscriptions;
};

export class AnaliticaServiceError extends Error {
  constructor(
    public readonly kind: 'forbidden' | 'invalidRange' | 'unknown',
    message: string,
  ) {
    super(message);
    this.name = 'AnaliticaServiceError';
  }
}