import { Link } from 'react-router-dom';
import { Button } from '@crm/ui';

export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-semibold text-primary">404</h1>
        <p className="text-muted-foreground mt-2 mb-6">Page not found</p>
        <Link to="/app/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
