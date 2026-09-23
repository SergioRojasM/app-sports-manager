export type AnaliticaPreset = '30d' | '90d' | '6m' | 'month' | 'custom';

export type AnaliticaDateRange = {
  dateFrom: string;
  dateTo: string;
  preset: AnaliticaPreset;
};

export type AnaliticaRevenue = {
  recognizedRevenue: number;
  previousPeriodRevenue: number;
  revenueChangePercent: number | null;
  yearToDateRevenue: number;
  pendingPaymentCount: number;
  pendingPaymentAmount: number;
  monthlyRevenue: Array<{
    monthStart: string;
    monthKey: string;
    recognizedRevenue: number;
    cumulativeRevenue: number;
  }>;
  revenueByPlan: Array<{
    planName: string;
    planTypeName: string | null;
    paymentCount: number;
    recognizedRevenue: number;
  }>;
  revenueByPaymentMethod: Array<{
    paymentMethodName: string;
    paymentCount: number;
    recognizedRevenue: number;
  }>;
  topAthletesByRevenue: Array<{
    athleteId: string;
    athleteName: string;
    paymentCount: number;
    recognizedRevenue: number;
  }>;
};

export type AnaliticaOperations = {
  scheduledTrainingCount: number;
  offeredCapacity: number;
  validBookingCount: number;
  cancelledBookingCount: number;
  occupancyPercent: number | null;
  trainingsWithoutCapacity: number;
  bookingByDiscipline: Array<{
    disciplineName: string;
    validBookingCount: number;
    cancelledBookingCount: number;
    offeredCapacity: number;
    occupancyPercent: number | null;
  }>;
  bookingByPublicStatus: Array<{
    label: string;
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

export type AnaliticaTeam = {
  membersByStatus: Record<string, number>;
  activeAthleteCount: number;
  activeAthletesByPlanType: Array<{
    planTypeName: string;
    athleteCount: number;
  }>;
  activeAthletesWithoutSubscriptionCount: number;
  membersWithoutSubscription: Array<{
    athleteId: string;
    athleteName: string;
    membershipStatus: string;
    latestBookingDate: string | null;
  }>;
};

export type AnaliticaDashboard = {
  revenue: AnaliticaRevenue;
  operations: AnaliticaOperations;
  team: AnaliticaTeam;
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