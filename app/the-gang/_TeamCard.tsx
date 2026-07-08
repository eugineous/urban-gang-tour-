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

export default function TeamCard({ member }: { member: CrewMember }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-surface transition-colors duration-200 ease-out hover:border-magenta/60">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-raised">
        {member.img ? (
          <Image
            src={member.img}
            alt={member.name}
            fill
            loading="lazy"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 18vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-raised">
            <span className="font-display text-5xl text-paper/20">{initials(member.name)}</span>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="font-display text-[17px] uppercase leading-tight tracking-[-0.02em]">{member.name}</div>
        <div className="mt-1 text-[11.5px] font-bold uppercase tracking-wide text-gold">{member.role}</div>
        {member.bio && <p className="mt-2.5 text-[12.5px] leading-relaxed text-paper/60">{member.bio}</p>}
        {member.ig && (
          <a
            href={`https://instagram.com/${member.ig}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-[12.5px] font-bold text-magenta-bright"
          >
            @{member.ig}
          </a>
        )}
      </div>
    </div>
  );
}
