import Image from "next/image";
import type { GameService } from "@/lib/lutris/types";
import { serviceLabels, shortServiceLabels } from "@/lib/lutris/services";

const logos: Partial<Record<GameService, { src: string; width: number; height: number }>> = {
  steam: { src: "/logos/Steam-Logo.png", width: 20, height: 20 },
  egs: { src: "/logos/Epic-Games-logo.png", width: 20, height: 20 },
  gog: { src: "/logos/gog-logo.png", width: 20, height: 20 },
  amazon: { src: "/logos/Amazon-Logo.png", width: 30, height: 17 },
  ubisoft: { src: "/logos/Ubisoft-Logo.png", width: 20, height: 20 },
  ea_app: { src: "/logos/Electronic-Arts-Logo-2006.png", width: 20, height: 20 },
};

export function ServiceLogo({ service }: { service: GameService }) {
  const logo = logos[service];
  return (
    <span className={`provider-logo provider-logo-${service}`} aria-hidden="true">
      {logo && <Image src={logo.src} alt="" width={logo.width} height={logo.height} sizes={`${logo.width}px`} />}
    </span>
  );
}

export function ServiceBadge({ service, compact = false }: { service: GameService; compact?: boolean }) {
  return <span className={`service-badge service-${service}`} title={serviceLabels[service]}><ServiceLogo service={service} />{compact ? <span className="sr-only">{serviceLabels[service]}</span> : shortServiceLabels[service]}</span>;
}
