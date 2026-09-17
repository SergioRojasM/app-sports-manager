import { AceptarInvitacionPage } from '@/components/portal/invitaciones';

type AceptarInvitacionRouteProps = {
  params: Promise<{ invitacion_id: string }>;
};

export default async function AceptarInvitacionRoute({ params }: AceptarInvitacionRouteProps) {
  const { invitacion_id: invitacionId } = await params;
  return <AceptarInvitacionPage invitacionId={invitacionId} />;
}
