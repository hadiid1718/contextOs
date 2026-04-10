import axiosInstance from '../lib/axios';

const orgService = {
  list: async () => {
    const { data } = await axiosInstance.get('/organisations');
    return data;
  },
  selectContext: async (orgId) => {
    const { data } = await axiosInstance.post(`/organisations/${orgId}/context`);
    return data;
  },
  listMembers: async (orgId) => {
    const { data } = await axiosInstance.get(`/organisations/${orgId}/memberships`);
    return data;
  },
  updateMemberRole: async ({ orgId, memberId, role }) => {
    const { data } = await axiosInstance.patch(`/organisations/${orgId}/memberships/${memberId}`, { role });
    return data;
  },
  removeMember: async ({ orgId, memberId }) => {
    const { data } = await axiosInstance.delete(`/organisations/${orgId}/memberships/${memberId}`);
    return data;
  },
  inviteMember: async ({ orgId, email, role }) => {
    const { data } = await axiosInstance.post(`/organisations/${orgId}/invitations`, { email, role });
    return data;
  },
  acceptInvitation: async ({ orgId, token }) => {
    const { data } = await axiosInstance.post(`/organisations/${orgId}/invitations/${token}/accept`);
    return data;
  },
  declineInvitation: async ({ orgId, token }) => {
    const { data } = await axiosInstance.post(`/organisations/${orgId}/invitations/${token}/decline`);
    return data;
  },
};

export default orgService;

