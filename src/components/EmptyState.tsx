import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  description?: string;
}

export function EmptyState({ message = 'No data found', description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Inbox className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      {description && <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">{description}</p>}
    </div>
  );
}
