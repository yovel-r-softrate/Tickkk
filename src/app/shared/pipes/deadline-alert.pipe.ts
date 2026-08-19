import { Pipe, PipeTransform } from '@angular/core';

export interface DeadlineStatus {
  text: string;
  colorClass: string;
  urgency: 'overdue' | 'urgent' | 'soon' | 'normal';
}

@Pipe({
  name: 'deadlineAlert',
  standalone: true
})
export class DeadlineAlertPipe implements PipeTransform {
  transform(deadline: string | Date | undefined): DeadlineStatus | null {
    if (!deadline) return null;

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMs < 0) {
      return {
        text: 'OVERDUE',
        colorClass: 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
        urgency: 'overdue'
      };
    }

    if (diffHours < 24) {
      const hours = Math.floor(diffHours);
      const mins = Math.floor((diffHours % 1) * 60);
      return {
        text: `DUE IN ${hours > 0 ? hours + 'h' : ''} ${mins}m`,
        colorClass: 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
        urgency: 'urgent'
      };
    }

    if (diffHours < 72) {
      const days = Math.floor(diffHours / 24);
      return {
        text: `DUE IN ${days}d`,
        colorClass: 'bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
        urgency: 'soon'
      };
    }

    return {
      text: 'ON TRACK',
      colorClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
      urgency: 'normal'
    };
  }
}
