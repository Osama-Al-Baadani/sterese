import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SnapchatIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.5c2.9 0 5 2.2 5 5.1 0 .8 0 1.5-.1 2.1.4.2.9 0 1.2-.1.4-.2 1-.1 1.2.4.2.5-.2.9-.6 1.1-.5.3-1.4.5-1.6 1.1-.1.4.1.9.4 1.4.6 1 1.6 1.9 2.9 2.2.3.1.5.3.5.6 0 .2-.2.5-.5.6-.6.3-1.5.4-1.7.7-.2.2-.1.6-.3.9-.2.3-.5.3-.9.3-.5 0-1.2-.1-1.8 0-.6.2-1.1.7-1.8 1.1-.6.4-1.2.5-1.9.5s-1.3-.1-1.9-.5c-.7-.4-1.2-.9-1.8-1.1-.6-.1-1.3 0-1.8 0-.4 0-.7 0-.9-.3-.2-.3-.1-.7-.3-.9-.2-.3-1.1-.4-1.7-.7-.3-.1-.5-.4-.5-.6 0-.3.2-.5.5-.6 1.3-.3 2.3-1.2 2.9-2.2.3-.5.5-1 .4-1.4-.2-.6-1.1-.8-1.6-1.1-.4-.2-.8-.6-.6-1.1.2-.5.8-.6 1.2-.4.3.1.8.3 1.2.1-.1-.6-.1-1.3-.1-2.1 0-2.9 2.1-5.1 5-5.1z" />
    </svg>
  );
}

export function TikTokIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.6 7.3a5.6 5.6 0 0 1-3.4-1.1 5.6 5.6 0 0 1-2-2.7h-3v12.1a2.9 2.9 0 1 1-2.1-2.8V9.7a6 6 0 1 0 5.1 5.9V9.4a8.5 8.5 0 0 0 5.4 1.9v-4z" />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M14 8.5h2.5V5.3c-.4-.06-1.9-.2-3.6-.2-3.6 0-6 2.2-6 6.2v2.7H3.5V18h3.4v10h4.1V18h3.3l.5-3.9H11V11.8c0-1.1.3-1.8 1.9-1.8H14V8.5Z" />
    </svg>
  );
}
