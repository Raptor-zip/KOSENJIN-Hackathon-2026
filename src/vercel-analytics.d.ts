declare module '@vercel/analytics' {
  interface AnalyticsProps {
    debug?: boolean;
    mode?: 'auto' | 'development' | 'production';
  }
  export function inject(props?: AnalyticsProps): void;
  export function track(
    name: string,
    properties?: Record<string, string | number | boolean | null | undefined>,
  ): void;
}
