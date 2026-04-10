import Card from '../components/Card';
import useNotifications from '../hooks/useNotifications';

const Notifications = () => {
  const { notifications } = useNotifications();

  return (
    <Card title="Notifications" description="Latest alerts from your integrations.">
      <ul className="space-y-2 text-sm text-text2">
        {notifications.length === 0 ? <li>No notifications yet.</li> : null}
        {notifications.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </Card>
  );
};

export default Notifications;

