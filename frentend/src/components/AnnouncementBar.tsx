import { Megaphone } from "lucide-react";

export default function AnnouncementBar({ text }: { text: string }) {
  return (
    <div className="bg-navy-900 py-2 text-center text-sm font-medium text-white">
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4">
        <Megaphone className="h-4 w-4 text-gold-400" aria-hidden />
        {text}
      </p>
    </div>
  );
}
