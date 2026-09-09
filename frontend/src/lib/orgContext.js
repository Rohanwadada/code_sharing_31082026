import { useOrganizationStore } from '@/store/organizationStore';
import { useTeamStore } from '@/store/teamStore';

export const getOrgContext = () => {
  const organizationId = useOrganizationStore.getState().organizationId;
  const teamId = useTeamStore.getState().teamId;

  return { organizationId: organizationId, teamId: teamId };
};
