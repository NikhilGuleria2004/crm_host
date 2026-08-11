import { useAuth } from '../context/AuthContext';

export function usePermissions() {
  const { permissions } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!permissions || permissions.length === 0) {
      return false;
    }

    if (permissions.includes('*')) {
      return true;
    }

    if (permissions.includes(permission)) {
      return true;
    }

    const [resource] = permission.split('.');
    if (permissions.includes(`${resource}.*`)) {
      return true;
    }

    return false;
  };

  return { hasPermission, permissions };
}
