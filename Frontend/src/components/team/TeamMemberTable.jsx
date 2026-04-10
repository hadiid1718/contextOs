import Badge from '../Badge';
import Button from '../Button';

const roleToneMap = {
  owner: 'success',
  admin: 'warning',
  member: 'neutral',
  viewer: 'neutral',
};

const roles = ['owner', 'admin', 'member', 'viewer'];

const initialsFromName = (name = '') => {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join('');
};

const TeamMemberTable = ({ members, roleUpdatingId, onRoleChange, onRemoveMember }) => {
  if (!members.length) {
    return <p className="text-sm text-text3">No active members found for this organisation.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-bg3 text-left text-xs uppercase tracking-wide text-text3">
          <tr>
            <th className="px-4 py-3">Member</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Danger zone</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-bg2">
          {members.map((member) => {
            const avatarText = initialsFromName(member.name || member.email || '?');
            const isUpdating = roleUpdatingId === member.memberId;

            return (
              <tr key={member.memberId}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand-dark">
                      {avatarText || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-text">{member.name || 'Team member'}</p>
                      <p className="text-text3">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={roleToneMap[member.role] || 'neutral'}>{member.role}</Badge>
                    <select
                      className="rounded-md border border-border bg-bg3 px-2 py-1 text-sm text-text2 outline-none ring-brand focus:border-border-strong focus:ring-1"
                      value={member.role}
                      onChange={(event) => onRoleChange(member, event.target.value)}
                      disabled={isUpdating}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Button type="button" variant="ghost" className="text-error hover:bg-error/15 hover:text-error" onClick={() => onRemoveMember(member)}>
                    Remove
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TeamMemberTable;

