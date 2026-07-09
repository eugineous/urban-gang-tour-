import Image from "next/image";
import type { CrewMember } from "@/content/team";

function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function TeamCard({ member, tilt = "-rotate-1" }: { member: CrewMember; tilt?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border-[3px] border-ink bg-white shadow-[5px_5px_0_#111] transition-transform duration-150 ease-out hover:-translate-y-1 ${tilt} hover:rotate-0`}>
      <div className="relative aspect-square w-full overflow-hidden border-b-[3px] border-ink bg-concrete">
        {member.img ? (
          <Image src={member.img} alt={member.name} fill loading="lazy" sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 18vw" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-concrete">
            <span className="font-display text-4xl text-ink/25">{initials(member.name)}</span>
          </div>
        )}
      </div>
      <div className="p-3.5">
        <div className="font-display text-[16px] uppercase leading-tight">{member.name}</div>
        <div className="mt-1 text-[11px] font-bold text-magenta">{member.role}</div>
        {member.ig && (
          <a href={`https://instagram.com/${member.ig}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[11.5px] font-bold text-ink/60">
            @{member.ig}
          </a>
        )}
      </div>
    </div>
  );
}
