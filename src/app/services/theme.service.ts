import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDarkMode = signal<boolean>(false);

  constructor() {
    this.checkInitialTheme();

    // Effect to update the DOM and localStorage whenever isDarkMode changes
    effect(() => {
      const isDark = this.isDarkMode();
      if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    });
  }

  private checkInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDarkMode.set(true);
    } else {
      this.isDarkMode.set(false);
    }
  }

  toggleTheme(event?: MouseEvent) {
    if (event) {
      document.documentElement.style.setProperty('--theme-click-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--theme-click-y', `${event.clientY}px`);
    } else {
      document.documentElement.style.setProperty('--theme-click-x', '50%');
      document.documentElement.style.setProperty('--theme-click-y', '50%');
    }

    const toggle = () => {
      const next = !this.isDarkMode();
      this.isDarkMode.set(next);
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    };

    if (!(document as any).startViewTransition) {
      toggle();
      return;
    }

    (document as any).startViewTransition(() => {
      toggle();
    });
  }
}
