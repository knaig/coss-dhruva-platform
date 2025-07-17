import { useEffect, useState } from "react";

interface RoleBasedComponentProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

const RoleBasedComponent: React.FC<RoleBasedComponentProps> = ({
  children,
  allowedRoles,
  fallback = null,
}) => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    setUserRole(role);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return null;
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default RoleBasedComponent;
